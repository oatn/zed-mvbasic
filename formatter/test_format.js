'use strict';
// Run: node formatter/test_format.js
// Expected values are the exact output of MVExtensions.mvbasic's formatter
// (verified line for line against your-publisher.jbasic-formatter out/formatter.js).
const assert = require('assert');
const { formatDocument } = require('./server');

const fmt = lines => formatDocument(lines.join('\n'));

// block statement indents by margin+indent, END dedents, PROGRAM/STOP hard left
assert.strictEqual(
  fmt(['PROGRAM TEST', 'IF A = 1 THEN', 'X = 1', 'END', 'STOP', '']),
  'PROGRAM TEST\n    IF A = 1 THEN\n        X = 1\n    END\nSTOP\n',
);

// FOR/NEXT nesting
assert.strictEqual(
  fmt(['FOR I = 1 TO 10', 'FOR J = 1 TO 10', 'X = I', 'NEXT J', 'NEXT I']),
  '    FOR I = 1 TO 10\n        FOR J = 1 TO 10\n            X = I\n        NEXT J\n    NEXT I',
);

// labels are left alone
assert.strictEqual(
  fmt(['MAIN:', 'RETURN']),
  'MAIN:\n    RETURN',
);

// quoted strings do not confuse block detection
assert.strictEqual(
  fmt(['IF X = "IF THEN" THEN', 'Y = 1', 'END']),
  '    IF X = "IF THEN" THEN\n        Y = 1\n    END',
);

// already formatted input is untouched
const already = 'PROGRAM T\n    IF A THEN\n        B = 1\n    END\n';
assert.strictEqual(fmt(already.split('\n')), already);

// comment lines are left alone by default (indentComment = ignore)
assert.strictEqual(
  fmt(['IF A THEN', '* keep me', 'END']),
  '    IF A THEN\n* keep me\n    END',
);

// CRLF input keeps working
assert.strictEqual(
  fmt(['PROGRAM T\r', 'STOP\r']),
  'PROGRAM T\nSTOP',
);

console.log('ok');
