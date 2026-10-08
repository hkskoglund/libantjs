'use strict';

var Message = require('../messages/Message'),
  Concat = require('../util/concat'),
  Channel = require('../channel/channel'),
  NotificationStartup = require('../messages/notification/NotificationStartup'),
  NotificationSerialError = require('../messages/notification/NotificationSerialError'),
  ChannelStatusMessage = require('../messages/requestedResponse/ChannelStatusMessage'),
  VersionMessage = require('../messages/requestedResponse/VersionMessage'),
  CapabilitiesMessage = require('../messages/requestedResponse/CapabilitiesMessage'),
  DeviceSerialNumberMessage = require('../messages/requestedResponse/DeviceSerialNumberMessage'),
  AdvancedBurstCapabilitiesMessage = require('../messages/requestedResponse/AdvancedBurstCapabilitiesMessage'),
  AdvancedBurstCurrentConfigurationMessage = require('../messages/requestedResponse/AdvancedBurstCurrentConfigurationMessage'),
  ChannelIdMessage = require('../messages/requestedResponse/ChannelIdMessage'),
  ConfigureEventBufferMessage = require('../messages/configuration/ConfigureEventBufferMessage'),
  BroadcastDataMessage = require('../messages/data/BroadcastDataMessage'),
  AcknowledgedDataMessage = require('../messages/data/AcknowledgedDataMessage'),
  BurstDataMessage = require('../messages/data/BurstDataMessage'),
  ExtendedBurstDataMessage = require('../messages/data/ExtendedBurstDataMessage'),
  AdvancedBurstDataMessage = require('../messages/data/AdvancedBurstDataMessage'),
  ChannelResponseMessage = require('../messages/ChannelResponseEvent/ChannelResponseMessage'),
  ChannelResponseEvent = require('../channel/channelResponseEvent');

module.exports = function(Host) {
  Host.prototype.deserialize = function(data) {
    var msgBytes,
      iStartOfMessage = 0,
      metaDataLength = Message.prototype.HEADER_LENGTH + Message.prototype.CRC_LENGTH,
      message,
      bufferUtil = new Concat(),
      totalMessageLength,
      frameError,
      event,
      NO_ERROR;

    if (this.previousPacket && this.previousPacket.byteLength)
    // Holds the rest of the ANT message when receiving more data than the requested in endpoint packet size
    {
      data = bufferUtil.concat(this.previousPacket, data);
      this.previousPacket = undefined;
    }

    while (iStartOfMessage < data.byteLength) {

      // Need at least header and CRC bytes
      if (data.byteLength - iStartOfMessage < metaDataLength) {
          this.previousPacket = data.subarray(iStartOfMessage);
          return;
      }

      totalMessageLength = data[iStartOfMessage + Message.prototype.iLENGTH] + metaDataLength;

      if (data.byteLength - iStartOfMessage < totalMessageLength) {
        this.previousPacket = data.subarray(iStartOfMessage);
        return;
      }

      msgBytes = data.subarray(iStartOfMessage, iStartOfMessage + totalMessageLength);
      frameError = Message.prototype.getFrameError(msgBytes);
      if (frameError) {
        this.emit(this.EVENT.ERROR, frameError);
        iStartOfMessage += totalMessageLength;
        continue;
      }

      message = undefined;

      switch (msgBytes[Message.prototype.iID]) {

        // Notifications

        case Message.prototype.NOTIFICATION_STARTUP:

          message = new NotificationStartup(msgBytes);
          this.emit(Message.prototype.MESSAGE[Message.prototype.NOTIFICATION_STARTUP], NO_ERROR, message);

          break;

        case Message.prototype.NOTIFICATION_SERIAL_ERROR:

          message = new NotificationSerialError(msgBytes);
          this.emit(Message.prototype.MESSAGE[Message.prototype.NOTIFICATION_SERIAL_ERROR], NO_ERROR, message);

          break;

          // Requested response

        case Message.prototype.CHANNEL_STATUS:

          message = new ChannelStatusMessage(msgBytes);
          this.emit(Message.prototype.MESSAGE[msgBytes[Message.prototype.iID]], NO_ERROR, message);

          break;

        case Message.prototype.ANT_VERSION:

          message = new VersionMessage(msgBytes);

          this.emit(Message.prototype.MESSAGE[msgBytes[Message.prototype.iID]], NO_ERROR, message);

          break;

        case Message.prototype.CAPABILITIES:

          message = new CapabilitiesMessage(msgBytes);
          this.emit(Message.prototype.MESSAGE[msgBytes[Message.prototype.iID]], NO_ERROR, message);

          break;

        case Message.prototype.DEVICE_SERIAL_NUMBER:

          message = new DeviceSerialNumberMessage(msgBytes);
          this.emit(Message.prototype.MESSAGE[msgBytes[Message.prototype.iID]], NO_ERROR, message);

          break;

        case Message.prototype.EVENT_BUFFER_CONFIGURATION:

          message = new ConfigureEventBufferMessage(msgBytes);
          this.emit(Message.prototype.MESSAGE[msgBytes[Message.prototype.iID]], NO_ERROR, message);

          break;

        case Message.prototype.ADVANCED_BURST_CAPABILITIES:

          switch (msgBytes[Message.prototype.iLENGTH]) {

            case 0x04:

              message = new AdvancedBurstCapabilitiesMessage(msgBytes);
              break;

            case 0x0A:

              message = new AdvancedBurstCurrentConfigurationMessage(msgBytes);
              break;
          }

          this.emit(Message.prototype.MESSAGE[msgBytes[Message.prototype.iID]], NO_ERROR, message);

          break;

        case Message.prototype.SET_CHANNEL_ID:

          message = new ChannelIdMessage(msgBytes);
          this.emit(Message.prototype.MESSAGE[msgBytes[Message.prototype.iID]], NO_ERROR, message);

          break;

          // Data

        case Message.prototype.BROADCAST_DATA:

          message = new BroadcastDataMessage(msgBytes);
          this.channel[message.channel].emit(Message.prototype.EVENT[Message.prototype.BROADCAST_DATA], message);

          break;

        case Message.prototype.ACKNOWLEDGED_DATA:

          message = new AcknowledgedDataMessage(msgBytes);
          this.channel[message.channel].emit(Message.prototype.EVENT[Message.prototype.ACKNOWLEDGED_DATA], message);

          break;

        case Message.prototype.BURST_TRANSFER_DATA:

          message = new BurstDataMessage(msgBytes);
          this.channel[message.channel].emit(Message.prototype.EVENT[Message.prototype.BURST_TRANSFER_DATA], message);

          if (message.sequenceNr === 0) // First packet (also for advanced burst)
            this.channel[message.channel].burst = new Uint8Array();

          this.channel[message.channel].burst = bufferUtil.concat(this.channel[message.channel].burst, message.packet);

          if (message.sequenceNr & 0x04) // Last packet
            this.channel[message.channel].emit(Channel.prototype.EVENT.BURST, this.channel[message.channel].burst);

          break;

        case Message.prototype.EXTENDED_BURST_TRANSFER_DATA:

          message = new ExtendedBurstDataMessage(msgBytes);
          this.channel[message.channel].emit(Message.prototype.EVENT[Message.prototype.EXTENDED_BURST_TRANSFER_DATA], message);

          if (message.sequenceNr === 0)
            this.channel[message.channel].burst = new Uint8Array();

          this.channel[message.channel].burst = bufferUtil.concat(this.channel[message.channel].burst, message.packet);

          if (message.sequenceNr & 0x04)
            this.channel[message.channel].emit(Channel.prototype.EVENT.BURST, this.channel[message.channel].burst);

          break;

        case Message.prototype.ADVANCED_BURST_TRANSFER_DATA:

          message = new AdvancedBurstDataMessage(msgBytes);
          this.channel[message.channel].emit(Message.prototype.EVENT[Message.prototype.BURST_TRANSFER_DATA], message);

          this.channel[message.channel].burst = bufferUtil.concat(this.channel[message.channel].burst, message.packet);

          if (message.sequenceNr & 0x04) // Last packet
            this.channel[message.channel].emit(Channel.prototype.EVENT.BURST, message);

          break;

        // Channel responses or RF event

        case Message.prototype.CHANNEL_RESPONSE:

          message = new ChannelResponseMessage(msgBytes);

          if (!message.isRFevent())
            event = ChannelResponseEvent.prototype.MESSAGE[message.response.code] + '_0x' + message.response.initiatingId.toString(16);
          else
            event = ChannelResponseEvent.prototype.MESSAGE[message.response.code];

          this.channel[message.response.channel].emit(event, NO_ERROR, message.response);

          break;

        default:

          message = 'Unable to parse received msg id ' + msgBytes[Message.prototype.iID];
          this.emit(this.EVENT.ERROR, message);

          break;
      }

      if (message)
        if (this.log.logging)
          this.log.debug( message.toString());

      iStartOfMessage += totalMessageLength;

      if (iStartOfMessage > data.byteLength) { // Should not happen with check above
        this.previousPacket = data.subarray(iStartOfMessage);
        return;
      }
    }

    this.previousPacket = undefined;
  };

};
