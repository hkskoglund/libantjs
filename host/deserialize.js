'use strict';
import Message from '../messages/message.js';
import Concat from '../util/concat.js';
import Channel from '../channel/channel.js';
import NotificationStartup from '../messages/notification/notification-startup.js';
import NotificationSerialError from '../messages/notification/notification-serial-error.js';
import ChannelStatusMessage from '../messages/requested-response/channel-status-message.js';
import VersionMessage from '../messages/requested-response/version-message.js';
import CapabilitiesMessage from '../messages/requested-response/capabilities-message.js';
import EventFilterMessage from '../messages/requested-response/event-filter-message.js';
import SduMaskMessage from '../messages/requested-response/sdu-mask-message.js';
import DeviceSerialNumberMessage from '../messages/requested-response/device-serial-number-message.js';
import AdvancedBurstCapabilitiesMessage from '../messages/requested-response/advanced-burst-capabilities-message.js';
import AdvancedBurstCurrentConfigurationMessage from '../messages/requested-response/advanced-burst-current-configuration-message.js';
import ChannelIdMessage from '../messages/requested-response/channel-id-message.js';
import ConfigureEventBufferMessage from '../messages/configuration/configure-event-buffer-message.js';
import BroadcastDataMessage from '../messages/data/broadcast-data-message.js';
import AcknowledgedDataMessage from '../messages/data/acknowledged-data-message.js';
import BurstDataMessage from '../messages/data/burst-data-message.js';
import ExtendedBurstDataMessage from '../messages/data/extended-burst-data-message.js';
import AdvancedBurstDataMessage from '../messages/data/advanced-burst-data-message.js';
import ChannelResponseMessage from '../messages/channel-response-event/channel-response-message.js';
import ChannelResponseEvent from '../channel/channel-response-event.js';



class HostDeserialize {
  deserialize(data) {
    var msgBytes,
      iStartOfMessage = 0,
      metaDataLength = Message.HEADER_LENGTH + Message.CRC_LENGTH,
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

      totalMessageLength = data[iStartOfMessage + Message.iLENGTH] + metaDataLength;

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

      switch (msgBytes[Message.iID]) {

        // Notifications

        case Message.NOTIFICATION_STARTUP:

          message = new NotificationStartup(msgBytes);
          this.emit(Message.MESSAGE[Message.NOTIFICATION_STARTUP], NO_ERROR, message);

          break;

        case Message.NOTIFICATION_SERIAL_ERROR:

          message = new NotificationSerialError(msgBytes);
          this.emit(Message.MESSAGE[Message.NOTIFICATION_SERIAL_ERROR], NO_ERROR, message);

          break;

          // Requested response

        case Message.CHANNEL_STATUS:

          message = new ChannelStatusMessage(msgBytes);
          this.emit(Message.MESSAGE[msgBytes[Message.iID]], NO_ERROR, message);

          break;

        case Message.ANT_VERSION:

          message = new VersionMessage(msgBytes);

          this.emit(Message.MESSAGE[msgBytes[Message.iID]], NO_ERROR, message);

          break;

        case Message.CAPABILITIES:

          message = new CapabilitiesMessage(msgBytes);
          this.emit(Message.MESSAGE[msgBytes[Message.iID]], NO_ERROR, message);

          break;

        case Message.DEVICE_SERIAL_NUMBER:

          message = new DeviceSerialNumberMessage(msgBytes);
          this.emit(Message.MESSAGE[msgBytes[Message.iID]], NO_ERROR, message);

          break;

        case Message.CONFIG_EVENT_FILTER:

          message = new EventFilterMessage(msgBytes);
          this.emit(Message.MESSAGE[msgBytes[Message.iID]], NO_ERROR, message);

          break;

        case Message.SET_SDU_MASK:

          message = new SduMaskMessage(msgBytes);
          this.emit(Message.MESSAGE[msgBytes[Message.iID]], NO_ERROR, message);

          break;

        case Message.EVENT_BUFFER_CONFIGURATION:

          message = new ConfigureEventBufferMessage(msgBytes);
          this.emit(Message.MESSAGE[msgBytes[Message.iID]], NO_ERROR, message);

          break;

        case Message.ADVANCED_BURST_CAPABILITIES:

          switch (msgBytes[Message.iLENGTH]) {

            case 0x04:

              message = new AdvancedBurstCapabilitiesMessage(msgBytes);
              break;

            case 0x0A:

              message = new AdvancedBurstCurrentConfigurationMessage(msgBytes);
              break;
          }

          this.emit(Message.MESSAGE[msgBytes[Message.iID]], NO_ERROR, message);

          break;

        case Message.SET_CHANNEL_ID:

          message = new ChannelIdMessage(msgBytes);
          this.emit(Message.MESSAGE[msgBytes[Message.iID]], NO_ERROR, message);

          break;

          // Data

        case Message.BROADCAST_DATA:

          message = new BroadcastDataMessage(msgBytes);
          this.channel[message.channel].emit(Message.EVENT[Message.BROADCAST_DATA], message);

          break;

        case Message.ACKNOWLEDGED_DATA:

          message = new AcknowledgedDataMessage(msgBytes);
          this.channel[message.channel].emit(Message.EVENT[Message.ACKNOWLEDGED_DATA], message);

          break;

        case Message.BURST_TRANSFER_DATA:

          message = new BurstDataMessage(msgBytes);
          this.channel[message.channel].emit(Message.EVENT[Message.BURST_TRANSFER_DATA], message);

          if (message.sequenceNr === 0) // First packet (also for advanced burst)
            this.channel[message.channel].burst = new Uint8Array();

          this.channel[message.channel].burst = bufferUtil.concat(this.channel[message.channel].burst, message.packet);

          if (message.sequenceNr & 0x04) // Last packet
            this.channel[message.channel].emit(Channel.EVENT.BURST, this.channel[message.channel].burst);

          break;

        case Message.EXTENDED_BURST_TRANSFER_DATA:

          message = new ExtendedBurstDataMessage(msgBytes);
          this.channel[message.channel].emit(Message.EVENT[Message.EXTENDED_BURST_TRANSFER_DATA], message);

          if (message.sequenceNr === 0)
            this.channel[message.channel].burst = new Uint8Array();

          this.channel[message.channel].burst = bufferUtil.concat(this.channel[message.channel].burst, message.packet);

          if (message.sequenceNr & 0x04)
            this.channel[message.channel].emit(Channel.EVENT.BURST, this.channel[message.channel].burst);

          break;

        case Message.ADVANCED_BURST_TRANSFER_DATA:

          message = new AdvancedBurstDataMessage(msgBytes);
          this.channel[message.channel].emit(Message.EVENT[Message.BURST_TRANSFER_DATA], message);

          this.channel[message.channel].burst = bufferUtil.concat(this.channel[message.channel].burst, message.packet);

          if (message.sequenceNr & 0x04) // Last packet
            this.channel[message.channel].emit(Channel.EVENT.BURST, message);

          break;

        // Channel responses or RF event

        case Message.CHANNEL_RESPONSE:

          message = new ChannelResponseMessage(msgBytes);

          if (!message.isRFevent())
            event = ChannelResponseEvent.MESSAGE[message.response.code] + '_0x' + message.response.initiatingId.toString(16);
          else
            event = ChannelResponseEvent.MESSAGE[message.response.code];

          this.channel[message.response.channel].emit(event, NO_ERROR, message.response);

          break;

        default:

          message = 'Unable to parse received msg id ' + msgBytes[Message.iID];
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

export default function(Host) {
  for (const methodName of Object.getOwnPropertyNames(HostDeserialize.prototype)) {
    if (methodName !== 'constructor') {
      Host.prototype[methodName] = HostDeserialize.prototype[methodName];
    }
  }
};
