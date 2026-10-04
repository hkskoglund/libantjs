'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const ResetSystemMessage = require('../messages/control/ResetSystemMessage');
const ChannelId = require('../channel/channelId');

test('ResetSystemMessage serializes to a valid reset frame', () => {
  const reset = new ResetSystemMessage();

  assert.deepEqual(Array.from(reset.serialize()), [0xa4, 0x01, 0x4a, 0x00, 0xef]);
});

test('ChannelId.decode rejects data shorter than four bytes even when the backing buffer is longer', () => {
  const data = Uint8Array.from([0x34, 0x12, 0x56, 0x78]);
  const channelId = new ChannelId();

  assert.throws(() => channelId.decode(data.subarray(0, 1)), {
    name: 'RangeError',
    message: 'Channel ID data must contain at least 4 bytes'
  });
});

test('ChannelId.decode respects the view offset and byte length', () => {
  const data = Uint8Array.from([0xff, 0xff, 0x34, 0x12, 0x56, 0x78, 0xff]);
  const channelId = new ChannelId();

  channelId.decode(data.subarray(2, 6));

  assert.equal(channelId.deviceNumber, 0x1234);
  assert.equal(channelId.deviceType, 0x56);
  assert.equal(channelId.transmissionType, 0x78);
});

test('ChannelId.decode clears a stale 20-bit device number', () => {
  const channelId = new ChannelId();

  channelId.decode(Uint8Array.from([1, 0, 0, 0x10]));
  assert.equal(channelId.deviceNumber20BIT, 0x10001);

  channelId.decode(Uint8Array.from([1, 0, 0, 0]));

  assert.equal(channelId.has20BitDeviceNumber(), 0);
  assert.equal(Object.hasOwn(channelId, 'deviceNumber20BIT'), false);
});
