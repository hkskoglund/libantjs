'use strict';

var Message = require('../messages/Message'),
  BroadcastDataMessage = require('../messages/data/BroadcastDataMessage'),
  AcknowledgedDataMessage = require('../messages/data/AcknowledgedDataMessage'),
  BurstDataMessage = require('../messages/data/BurstDataMessage'),
  ExtendedBurstDataMessage = require('../messages/data/ExtendedBurstDataMessage'),
  AdvancedBurstDataMessage = require('../messages/data/AdvancedBurstDataMessage');

module.exports = function(Host) {
  Host.prototype.sendBroadcastData = function(channel, broadcastData, callback, acknowledge) {
    var data = broadcastData,
      msg;

    if (!acknowledge)
      msg = new BroadcastDataMessage();
    else
      msg = new AcknowledgedDataMessage();

    if (typeof broadcastData === 'object' && broadcastData.constructor.name === 'Array') // Allows sending of [1,2,3,4,5,6,7,8]
      data = new Uint8Array(broadcastData);

    msg.encode(channel, data);

    this.sendMessage(msg, undefined, channel, callback);
  };

  // p. 96 ANT Message protocol and usave rev. 5.0
  // Event TRANSFER_TX_COMPLETED channel event if successfull,
  // Event TRANSFER_TX_FAILED -> msg. failed to reach master or response from master failed to reach the slave -> slave may retry
  // Event GO_TO_SEARCH is received if channel is dropped -> channel should be unassigned
  Host.prototype.sendAcknowledgedData = function(channel, acknowledgedData, callback) {

    this.sendBroadcastData(channel, acknowledgedData, callback, true);
  };

  // Send an individual packet as part of a burst transfer
  Host.prototype.sendBurstTransferPacket = function(sequenceChannel, packet, callback) {
    var msg;

    if (packet.byteLength === Message.prototype.PAYLOAD_LENGTH) // Use ordinary burst if only 8-byte packets
    {
      msg = new BurstDataMessage();
    } else {
      msg = new AdvancedBurstDataMessage();
    }

    msg.encode(sequenceChannel, packet);

    this.sendMessage(msg, undefined, undefined, callback);
  };

  Host.prototype.sendExtendedBurstTransfer = function(channel, channelId, data, callback) {
    var packetCount,
      packetIndex = 0,
      sequenceNr = 0,
      packet,
      paddedPacket,
      sequenceChannel,
      message,
      sendNextPacket;

    if (Array.isArray(data))
      data = new Uint8Array(data);
    if (!data || typeof data.subarray !== 'function' || typeof data.byteLength !== 'number')
      throw new TypeError('Extended burst payload must be a byte array');
    if (typeof callback !== 'function')
      throw new TypeError('Extended burst transfer requires a callback');
    if (!Number.isInteger(channel) || channel < 0 || channel > 0x1F)
      throw new RangeError('Extended burst channel must be between 0 and 31');

    packetCount = Math.ceil(data.byteLength / Message.prototype.PAYLOAD_LENGTH);

    sendNextPacket = function() {
      if (sequenceNr > 3)
        sequenceNr = 1;
      if (packetIndex === packetCount - 1)
        sequenceNr |= 0x04;

      packet = data.subarray(
        packetIndex * Message.prototype.PAYLOAD_LENGTH,
        (packetIndex + 1) * Message.prototype.PAYLOAD_LENGTH
      );
      if (packet.byteLength < Message.prototype.PAYLOAD_LENGTH) {
        paddedPacket = new Uint8Array(Message.prototype.PAYLOAD_LENGTH);
        paddedPacket.set(packet);
        packet = paddedPacket;
      }

      sequenceChannel = (sequenceNr << 5) | channel;
      message = new ExtendedBurstDataMessage();
      message.encode(sequenceChannel, channelId, packet);
      this.sendMessage(message, undefined, undefined, function(error, sentMessage) {
        if (error) {
          callback(error, sentMessage);
          return;
        }

        packetIndex++;
        sequenceNr++;
        if (packetIndex < packetCount)
          sendNextPacket();
        else
          callback();
      });
    }.bind(this);

    if (packetCount === 0)
      throw new RangeError('Extended burst payload must not be empty');

    sendNextPacket();
  };

  // Sends bulk data
  // EVENT_TRANSFER_TX_START - next channel period after message sent to device
  // EVENT_TRANSFER_TX_COMPLETED
  // EVENT_TRANSFER_TX_FAILED : After 5 retries
  Host.prototype.sendBurstTransfer = function(channel, data, packetsPerURB, callback) {
    var cb,
      numberOfPackets,
      packetLength,
      packetNr = 0,
      sequenceNr = 0,
      sequenceChannel, // 7:5 bits = sequence nr (000 = first packet, 7 bit high on last packet) - transfer integrity, 0:4 bits channel nr
      packet,
      tmpPacket,

      sendPacket = function _sendPacket() {

        if (sequenceNr > 3) // Roll over sequence nr
          sequenceNr = 1;

        if (packetNr === (numberOfPackets - 1)) {
          sequenceNr = sequenceNr | 0x04; // Set most significant bit high for last packet, i.e sequenceNr 000 -> 100

        }

        packet = data.subarray(packetNr * packetLength, (packetNr + 1) * packetLength);

        // Fill with 0 for last packet if necessary

        if (packet.byteLength < packetLength) {
          tmpPacket = new Uint8Array(packetLength);
          tmpPacket.set(packet);
          packet = tmpPacket;
        }

        sequenceChannel = (sequenceNr << 5) | channel;

        this.sendBurstTransferPacket(sequenceChannel, packet, function _sendBurstTransferPacket(err, msg) {

          if (!err) {

            sequenceNr++;
            packetNr++;

            if (packetNr < numberOfPackets)
              sendPacket();
             else
              cb();
          } else {

            cb(err);
          }

        });
      }.bind(this);

    if (typeof data === 'object' && data.constructor.name === 'Array') // Allows sending of Array [1,2,3,4,5,6,7,8,...]
      data = new Uint8Array(data);

    if (typeof packetsPerURB === 'function') // Standard burst
    {
      packetLength = Message.prototype.PAYLOAD_LENGTH;
      cb = packetsPerURB;
    } else {

      packetLength = Message.prototype.PAYLOAD_LENGTH * packetsPerURB;
      cb = callback;
    }

    numberOfPackets = Math.ceil(data.byteLength / packetLength);

    if (this.log.logging)
      this.log.debug( 'Sending burst, ' + numberOfPackets + ' packets, packet length ' + packetLength + ' channel ' + channel + ' ' + data.byteLength + ' bytes ');

    sendPacket();

  };

  // For compability with spec. interface 9.5.5.4 Advanced Burst Data 0x72
  Host.prototype.sendAdvancedTransfer = function(channel, data, size, packetsPerURB, callback) {
    // Note size ignored/not necessary
    this.sendBurstTransfer(channel, data, packetsPerURB, callback);
  };

};
