'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const ResetSystemMessage = require('../messages/control/ResetSystemMessage');

test('ResetSystemMessage serializes to a valid reset frame', () => {
  const reset = new ResetSystemMessage();

  assert.deepEqual(Array.from(reset.serialize()), [0xa4, 0x01, 0x4a, 0x00, 0xef]);
});
