'use strict';

var Message = require('../messages/message'),
  BroadcastDataMessage = require('../messages/data/broadcast-data-message'),
  AcknowledgedDataMessage = require('../messages/data/acknowledged-data-message'),
  BurstDataMessage = require('../messages/data/burst-data-message'),
  ExtendedBurstDataMessage = require('../messages/data/extended-burst-data-message'),
  AdvancedBurstDataMessage = require('../messages/data/advanced-burst-data-message');

class HostTransfers {
  sendBroadcastData(channel, broadcastData, acknowledge) {
    var data = broadcastData,
      msg;

    if (!acknowledge)
      msg = new BroadcastDataMessage();
    else
      msg = new AcknowledgedDataMessage();

    if (typeof broadcastData === 'object' && broadcastData.constructor.name === 'Array') // Allows sending of [1,2,3,4,5,6,7,8]
      data = new Uint8Array(broadcastData);

    msg.encode(channel, data);

    return this.sendMessage(msg, undefined, channel);
  }

  // p. 96 ANT Message protocol and usave rev. 5.0
  // Event TRANSFER_TX_COMPLETED channel event if successfull,
  // Event TRANSFER_TX_FAILED -> msg. failed to reach master or response from master failed to reach the slave -> slave may retry
  // Event GO_TO_SEARCH is received if channel is dropped -> channel should be unassigned
  sendAcknowledgedData(channel, acknowledgedData) {

    return this.sendBroadcastData(channel, acknowledgedData, true);
  }

  // Send an individual packet as part of a burst transfer
  sendBurstTransferPacket(sequenceChannel, packet) {
    var msg;

    if (packet.byteLength === Message.prototype.PAYLOAD_LENGTH) // Use ordinary burst if only 8-byte packets
    {
      msg = new BurstDataMessage();
    } else {
      msg = new AdvancedBurstDataMessage();
    }

    msg.encode(sequenceChannel, packet);

    return this.sendMessage(msg);
  }

  async sendExtendedBurstTransfer(channel, channelId, data) {
    if (Array.isArray(data))
      data = new Uint8Array(data);
    if (!data || typeof data.subarray !== 'function' || typeof data.byteLength !== 'number')
      throw new TypeError('Extended burst payload must be a byte array');
    if (!Number.isInteger(channel) || channel < 0 || channel > 0x1F)
      throw new RangeError('Extended burst channel must be between 0 and 31');

    const packetCount = Math.ceil(data.byteLength / Message.prototype.PAYLOAD_LENGTH);

    if (packetCount === 0)
      throw new RangeError('Extended burst payload must not be empty');

    let sequenceNr = 0;

    for (let packetIndex = 0; packetIndex < packetCount; packetIndex++) {
      if (sequenceNr > 3)
        sequenceNr = 1;
      if (packetIndex === packetCount - 1)
        sequenceNr |= 0x04;

      let packet = data.subarray(
        packetIndex * Message.prototype.PAYLOAD_LENGTH,
        (packetIndex + 1) * Message.prototype.PAYLOAD_LENGTH
      );
      if (packet.byteLength < Message.prototype.PAYLOAD_LENGTH) {
        const paddedPacket = new Uint8Array(Message.prototype.PAYLOAD_LENGTH);
        paddedPacket.set(packet);
        packet = paddedPacket;
      }

      const message = new ExtendedBurstDataMessage();
      message.encode((sequenceNr << 5) | channel, channelId, packet);
      await this.sendMessage(message);

      sequenceNr++;
    }
  }

  // Sends bulk data
  // EVENT_TRANSFER_TX_START - next channel period after message sent to device
  // EVENT_TRANSFER_TX_COMPLETED
  // EVENT_TRANSFER_TX_FAILED : After 5 retries
  async sendBurstTransfer(channel, data, packetsPerURB = 1) {
    var sequenceNr = 0;

    if (typeof data === 'object' && data.constructor.name === 'Array') // Allows sending of Array [1,2,3,4,5,6,7,8,...]
      data = new Uint8Array(data);

    const packetLength = Message.prototype.PAYLOAD_LENGTH * packetsPerURB;
    const numberOfPackets = Math.ceil(data.byteLength / packetLength);

    if (this.log.logging)
      this.log.debug( 'Sending burst, ' + numberOfPackets + ' packets, packet length ' + packetLength + ' channel ' + channel + ' ' + data.byteLength + ' bytes ');

    for (let packetNr = 0; packetNr < numberOfPackets; packetNr++) {

      if (sequenceNr > 3) // Roll over sequence nr
        sequenceNr = 1;

      if (packetNr === (numberOfPackets - 1)) {
        sequenceNr = sequenceNr | 0x04; // Set most significant bit high for last packet, i.e sequenceNr 000 -> 100
      }

      let packet = data.subarray(packetNr * packetLength, (packetNr + 1) * packetLength);

      // Fill with 0 for last packet if necessary

      if (packet.byteLength < packetLength) {
        const tmpPacket = new Uint8Array(packetLength);
        tmpPacket.set(packet);
        packet = tmpPacket;
      }

      // 7:5 bits = sequence nr (000 = first packet, 7 bit high on last packet) - transfer integrity, 0:4 bits channel nr
      await this.sendBurstTransferPacket((sequenceNr << 5) | channel, packet);

      sequenceNr++;
    }
  }

  // For compability with spec. interface 9.5.5.4 Advanced Burst Data 0x72
  sendAdvancedTransfer(channel, data, size, packetsPerURB) {
    // Note size ignored/not necessary
    return this.sendBurstTransfer(channel, data, packetsPerURB);
  }

}

module.exports = function(Host) {
  for (const methodName of Object.getOwnPropertyNames(HostTransfers.prototype)) {
    if (methodName !== 'constructor') {
      Host.prototype[methodName] = HostTransfers.prototype[methodName];
    }
  }
};
