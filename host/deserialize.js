'use strict';

var Message = require('../messages/message'),
  Concat = require('../util/concat'),
  Channel = require('../channel/channel'),
  NotificationStartup = require('../messages/notification/notification-startup'),
  NotificationSerialError = require('../messages/notification/notification-serial-error'),
  ChannelStatusMessage = require('../messages/requested-response/channel-status-message'),
  VersionMessage = require('../messages/requested-response/version-message'),
  CapabilitiesMessage = require('../messages/requested-response/capabilities-message'),
  DeviceSerialNumberMessage = require('../messages/requested-response/device-serial-number-message'),
  AdvancedBurstCapabilitiesMessage = require('../messages/requested-response/advanced-burst-capabilities-message'),
  AdvancedBurstCurrentConfigurationMessage = require('../messages/requested-response/advanced-burst-current-configuration-message'),
  ChannelIdMessage = require('../messages/requested-response/channel-id-message'),
  ConfigureEventBufferMessage = require('../messages/configuration/configure-event-buffer-message'),
  BroadcastDataMessage = require('../messages/data/broadcast-data-message'),
  AcknowledgedDataMessage = require('../messages/data/acknowledged-data-message'),
  BurstDataMessage = require('../messages/data/burst-data-message'),
  ExtendedBurstDataMessage = require('../messages/data/extended-burst-data-message'),
  AdvancedBurstDataMessage = require('../messages/data/advanced-burst-data-message'),
  ChannelResponseMessage = require('../messages/channel-response-event/channel-response-message'),
  ChannelResponseEvent = require('../channel/channel-response-event');

class HostDeserialize {
  deserialize(data) {
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
        this.emit(this.constructor.EVENT.ERROR, frameError);
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
          this.emit(this.constructor.EVENT.ERROR, message);

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
  }

}

module.exports = function(Host) {
  for (const methodName of Object.getOwnPropertyNames(HostDeserialize.prototype)) {
    if (methodName !== 'constructor') {
      Host.prototype[methodName] = HostDeserialize.prototype[methodName];
    }
  }
};
