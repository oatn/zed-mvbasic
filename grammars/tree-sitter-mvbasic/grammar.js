/**
 * Tree-sitter grammar for MV BASIC (jBASE / T24 / PickBASIC / UniVerse ...).
 *
 * Deliberately flat: a line is [label] token* [inline comment] newline.
 * All words lex as `identifier`; statement keywords and intrinsic functions
 * are recognised by regex in languages/mvbasic/highlights.scm, mirroring how
 * the VS Code tmLanguage grammar does it.
 */
module.exports = grammar({
  name: 'mvbasic',

  extras: $ => [/[ \t\r]/],

  rules: {
    // every line is content + newline; the last line may omit the newline
    source_file: $ => seq(
      repeat(seq(optional($._line_content), $._newline)),
      optional($._line_content),
    ),

    _line_content: $ => choice(
      $.comment,
      $.label,
      seq($.label, $.comment),
      seq(optional($.label), repeat1($._token), optional($.inline_comment)),
    ),

    _newline: $ => '\n',

    comment: $ => token(choice(
      /[!*][^\n]*/,
      /REM[ \t][^\n]*/i,
    )),

    // semi-colon comment at the end of a statement
    inline_comment: $ => token(choice(
      /;[ \t]*[!*][^\n]*/,
      /;[ \t]*REM[ \t][^\n]*/i,
    )),

    // LABEL: at the start of a line
    label: $ => token(/[A-Za-z][A-Za-z0-9_.$]*:/),

    string: $ => token(choice(
      /'[^'\n]*'/,
      /"[^"\n]*"/,
      /\\[^\\\n]*\\/,
    )),

    number: $ => token(/\d+(\.\d+)?/),

    // @ID, @AM, @FM, @RECORD ...
    system_variable: $ => token(/@[A-Za-z][A-Za-z0-9_.]*/),

    // $INSERT, $INCLUDE, $MAP ...
    preprocessor: $ => token(/\$[A-Za-z]+/),

    identifier: $ => token(/[A-Za-z][A-Za-z0-9_.$]*/),

    operator: $ => token(choice(
      '=', '#', '<=', '>=', '<>', '=>', '<', '>',
      '+', '-', '*', '/', ':', ',', ';', '&', '^', '?', '|',
    )),

    _token: $ => choice(
      $.string,
      $.number,
      $.system_variable,
      $.preprocessor,
      $.identifier,
      $.operator,
      '(',
      ')',
      '[',
      ']',
    ),
  },
});
