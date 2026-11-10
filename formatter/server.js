#!/usr/bin/env node
'use strict';
/**
 * MV BASIC formatter + the minimal LSP wrapper that serves it.
 *
 * Single file on purpose: the Zed extension downloads this script into its
 * working directory and runs it as `node <path>/server.js`, so it must not
 * depend on any other file being on disk.
 *
 * Formatting logic ported verbatim from MVExtensions.mvbasic
 * (client/src/extension.ts, registerDocumentFormattingEditProvider).
 * MIT License. https://github.com/mvextensions/mvbasic
 */

// ---------------------------------------------------------------------------
// formatting
// ---------------------------------------------------------------------------

const DEFAULTS = {
  margin: 4,               // T24/jBASE: code starts at column 4
  indent: 4,               // indent width per block
  indentComment: 'ignore', // left | margin | code | ignore
  formatStructure: true,   // PROGRAM/SUBROUTINE/FUNCTION/STOP hard left
};

const rBlockStart = /^(begin case$|lock |key\(|if |commit |rollback |readnext |open |write |writeu |writev |writevu |read |readv |readu |readt |readvu |matreadu |locate |locate\(|openseq |matread |create |readlist |openpath |find |findstr |bscan|callj )/i;
const rBlockAlways = /^(for |loop( |$))/i;
const rBlockContinue = / (then|else|case|on error|locked)$/i;
const rBlockEnd = /^(end|end case|next|next\s+.+|repeat)$| repeat$/i;
const rBlockCase = /^begin case$/i;
const rBlockEndCase = /^end case$/i;
const rBlockTransaction = /^(begin transaction|begin work)/i;
const rBlockEndTransaction = /^(end transaction|end work)/i;
const rElseEnd = /^end\s(else|then)\s+?.+?/i;
const rFormatStructure = /^\s*(function|program|stop|sub|subroutine)\b.*$/i;
const rLabel = /^([\w.$]+:(?!=)|[0-9.]+)/;
const rComment = /^\s*(\*|!|REM\s+?).*/i;
const tComment = /;\s*(\*|!|REM\s+?).*/i;
const lComment = /^\s*([\w.$]+:(?!=)|[0-9.]+)(\s*(\*|!|REM\s+?).*)/i;
const qStrings = /'.*?'|".*?"|\\.*?\\/g;
const rParenthesis = /\(.*\)/g;

/** @returns {{lineNumber:number, text:string}[]} only the lines that change */
function formatLines(lines, options = {}) {
  const { margin, indent, indentComment, formatStructure } = { ...DEFAULTS, ...options };

  let Level = 0;
  const RowLevel = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    line = line.replace(rComment, '');

    // comment after a label, no semi-colon
    const lc = lComment.exec(line);
    if (lc) line = lc[1];

    // trailing comment after a semi-colon
    line = line.replace(tComment, '');

    // blank out parentheses / quoted strings, keeping positions
    line = line.replace(rParenthesis, m => '(' + ' '.repeat(Math.max(0, m.length - 2)) + ')');
    line = line.replace(qStrings, m => m[0] + ' '.repeat(Math.max(0, m.length - 2)) + m[0]);

    line = line.trim();

    let position = i;
    RowLevel[i] = Level;

    if (rBlockStart.test(line)) {
      Level++;
      if (!rBlockContinue.test(line)) Level--; // single line statement
      position = i + 1;
    }
    if (rBlockCase.test(line)) {
      Level++;
      position = i + 1;
    }
    if (rBlockEndCase.test(line)) Level--;
    if (rElseEnd.test(line)) Level--;
    if (rBlockTransaction.test(line)) {
      Level++;
      position = i + 1;
    }
    if (rBlockEndTransaction.test(line)) Level--;
    if (rBlockAlways.test(line.trim())) {
      Level++;
      position = i + 1;
    }
    if (rBlockEnd.test(line.trim())) {
      Level--;
      position = i;
    }
    RowLevel[position] = Level;
  }

  const edits = [];
  for (let i = 0; i < lines.length; i++) {
    const lineText = lines[i].trim();

    if (rLabel.test(lineText)) continue;
    if (RowLevel[i] === undefined) continue;

    let indentation = RowLevel[i] * indent + margin;

    if (rComment.test(lineText)) {
      if (indentComment === 'left') indentation = 0;
      else if (indentComment === 'margin') indentation = margin;
      else if (indentComment === 'code') { /* keep computed indentation */ }
      else continue; // ignore / missing / invalid: leave comment alone
    }

    if (formatStructure && rFormatStructure.test(lineText)) indentation = 0;

    if (/^case\s/i.test(lineText)) indentation -= indent;
    if (/^while\s|^until\s/i.test(lineText)) indentation -= indent;

    const tempLine = lineText.replace(tComment, '').trim();
    if (/^end else$/i.test(tempLine)) indentation -= indent;

    const blank = lineText.replace(/\s/g, '').length === 0;
    const newText = (indentation < 1 || blank) ? lineText : ' '.repeat(indentation) + lineText;

    if (newText !== lines[i]) edits.push({ lineNumber: i, text: newText });
  }
  return edits;
}

/** format a whole document; returns the full new text */
function formatDocument(text, options) {
  const lines = text.split('\n').map(l => (l.endsWith('\r') ? l.slice(0, -1) : l));
  for (const e of formatLines(lines, options)) lines[e.lineNumber] = e.text;
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// LSP server (formatting only, full document sync)
// ---------------------------------------------------------------------------

const num = (v, d) => (v === undefined ? d : Number(v));
const OPTIONS = {
  margin: num(process.env.MVBASIC_MARGIN, DEFAULTS.margin),
  indent: num(process.env.MVBASIC_INDENT, DEFAULTS.indent),
  indentComment: process.env.MVBASIC_INDENT_COMMENT || DEFAULTS.indentComment,
  formatStructure: process.env.MVBASIC_FORMAT_STRUCTURE
    ? process.env.MVBASIC_FORMAT_STRUCTURE !== '0'
    : DEFAULTS.formatStructure,
};

const documents = new Map(); // uri -> text

function send(msg) {
  const json = JSON.stringify(msg);
  process.stdout.write(`Content-Length: ${Buffer.byteLength(json)}\r\n\r\n${json}`);
}

function respond(id, result) { send({ jsonrpc: '2.0', id, result }); }
function respondError(id, message) { send({ jsonrpc: '2.0', id, error: { code: -32603, message } }); }

function applyEdits(params) {
  const uri = params.textDocument.uri;
  const text = documents.get(uri);
  if (text === undefined) return [];

  const formatted = formatDocument(text, OPTIONS);
  if (formatted === text) return [];

  const lines = text.split('\n');
  return [{
    range: {
      start: { line: 0, character: 0 },
      end: { line: lines.length - 1, character: lines[lines.length - 1].length },
    },
    newText: formatted,
  }];
}

function handleMessage(msg) {
  const { id, method, params } = msg;

  switch (method) {
    case 'initialize':
      return respond(id, {
        capabilities: { textDocumentSync: 1, documentFormattingProvider: true },
        serverInfo: { name: 'mvbasic-formatter' },
      });
    case 'shutdown':
      return respond(id, null);
    case 'exit':
      return process.exit(0);
    case 'textDocument/didOpen':
      documents.set(params.textDocument.uri, params.textDocument.text);
      return;
    case 'textDocument/didChange':
      // full sync: take the last full-text change
      if (params.contentChanges.length) {
        documents.set(params.textDocument.uri, params.contentChanges[params.contentChanges.length - 1].text);
      }
      return;
    case 'textDocument/didClose':
      documents.delete(params.textDocument.uri);
      return;
    case 'textDocument/formatting':
      try { return respond(id, applyEdits(params)); }
      catch (e) { return respondError(id, String((e && e.message) || e)); }
    default:
      if (id !== undefined) respond(id, null); // notifications are dropped
  }
}

/** Content-Length framed JSON-RPC over stdio */
function startServer() {
  let buffer = Buffer.alloc(0);

  process.stdin.on('data', chunk => {
    buffer = Buffer.concat([buffer, chunk]);
    for (;;) {
      const sep = buffer.indexOf('\r\n\r\n');
      if (sep < 0) return;
      const header = buffer.slice(0, sep).toString('ascii');
      const match = /Content-Length:\s*(\d+)/i.exec(header);
      if (!match) { buffer = buffer.slice(sep + 4); continue; }
      const length = Number(match[1]);
      const start = sep + 4;
      if (buffer.length < start + length) return;
      const body = buffer.slice(start, start + length).toString('utf8');
      buffer = buffer.slice(start + length);
      try { handleMessage(JSON.parse(body)); } catch (e) {
        process.stderr.write(`mvbasic-formatter: ${e}\n`);
      }
    }
  });

  process.stdin.on('end', () => process.exit(0));
}

module.exports = { formatLines, formatDocument, DEFAULTS, startServer };

// `node server.js` / `node server.js --stdio`
if (require.main === module) startServer();
