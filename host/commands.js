'use strict';
import Message from '../messages/message.js';
import ResetSystemMessage from '../messages/control/reset-system-message.js';
import SleepMessage from '../messages/control/sleep-message.js';
import RequestMessage from '../messages/control/request-message.js';
import ConfigureAdvancedBurstMessage from '../messages/configuration/configure-advanced-burst-message.js';
import ConfigureEventBufferMessage from '../messages/configuration/configure-event-buffer-message.js';
import LibConfigMessage from '../messages/configuration/lib-config-message.js';
import UnAssignChannelMessage from '../messages/configuration/un-assign-channel-message.js';
import AssignChannelMessage from '../messages/configuration/assign-channel-message.js';
import SetChannelIDMessage from '../messages/configuration/set-channel-id-message.js';
import SetSerialNumChannelIdMessage from '../messages/configuration/set-serial-num-channel-id-message.js';
import SetChannelPeriodMessage from '../messages/configuration/set-channel-period-message.js';
import SetLowPriorityChannelSearchTimeoutMessage from '../messages/configuration/set-low-priority-channel-search-timeout-message.js';
import SetChannelSearchTimeoutMessage from '../messages/configuration/set-channel-search-timeout-message.js';
import SetChannelRFFreqMessage from '../messages/configuration/set-channel-rf-freq-message.js';
import SetNetworkKeyMessage from '../messages/configuration/set-network-key-message.js';
import SetSearchWaveformMessage from '../messages/configuration/set-search-waveform-message.js';
import SetTransmitPowerMessage from '../messages/configuration/set-transmit-power-message.js';
import SetChannelTxPowerMessage from '../messages/configuration/set-channel-tx-power-message.js';
import SetProximitySearchMessage from '../messages/configuration/set-proximity-search-message.js';
import SetChannelSearchPriorityMessage from '../messages/configuration/set-channel-search-priority-message.js';
import OpenRxScanModeMessage from '../messages/control/open-rx-scan-mode-message.js';
import OpenChannelMessage from '../messages/control/open-channel-message.js';
import CloseChannelMessage from '../messages/control/close-channel-message.js';



class HostCommands {
  async resetSystem() {
    const DELAY = 500;

    const notificationStartup = await this.sendMessage(new ResetSystemMessage(), Message.MESSAGE[Message.NOTIFICATION_STARTUP]);

    if (this.log.logging)
      this.log.debug( 'Waiting ' + DELAY + ' ms after reset system (for post-reset device state)');
    await new Promise((resolve) => setTimeout(resolve, DELAY));

    return notificationStartup;
  }

  sleep() {
    return this.sendMessage(new SleepMessage());
  }

  getChannelId(channel) {

    return this.sendMessage(new RequestMessage(channel, Message.SET_CHANNEL_ID), Message.MESSAGE[Message.SET_CHANNEL_ID]);
  }

  getVersion() {

    return this.sendMessage(new RequestMessage(undefined, Message.ANT_VERSION), Message.MESSAGE[Message.ANT_VERSION]);
  }

  getCapabilities() {

    return this.sendMessage(new RequestMessage(undefined, Message.CAPABILITIES), Message.MESSAGE[Message.CAPABILITIES]);
  }

  getAdvancedBurstCapabilities() {

    return this.sendMessage(new RequestMessage(0x00, Message.ADVANCED_BURST_CAPABILITIES), Message.MESSAGE[Message.ADVANCED_BURST_CAPABILITIES]);
  }

  getAdvancedBurstConfiguration() {

    return this.sendMessage(new RequestMessage(0x01, Message.ADVANCED_BURST_CAPABILITIES), Message.MESSAGE[Message.ADVANCED_BURST_CAPABILITIES]);
  }

  // For convenience
  enableAdvancedBurst(maxPacketLength = this.constructor.ADVANCED_BURST.MAX_PACKET_24BYTES) {

    return this.configAdvancedBurst(this.constructor.ADVANCED_BURST.ENABLE, maxPacketLength, 0, 0);
  }

  disableAdvancedBurst() {
    return this.configAdvancedBurst(this.constructor.ADVANCED_BURST.DISABLE, this.constructor.ADVANCED_BURST.MAX_PACKET_24BYTES, 0, 0);
  }

  configAdvancedBurst(enable, maxPacketLength, requiredFeatures, optionalFeatures, stallCount, retryCount) {

    return this.sendMessage(new ConfigureAdvancedBurstMessage(enable, maxPacketLength, requiredFeatures, optionalFeatures, stallCount, retryCount));
  }

  getSerialNumber() {

    return this.sendMessage(new RequestMessage(undefined, Message.DEVICE_SERIAL_NUMBER), Message.MESSAGE[Message.DEVICE_SERIAL_NUMBER]);
  }

  configEventBuffer(config, size, time) {
    return this.sendMessage(new ConfigureEventBufferMessage(config, size, time));
  }

  getEventBufferConfiguration() {

    return this.sendMessage(new RequestMessage(undefined, Message.EVENT_BUFFER_CONFIGURATION), Message.MESSAGE[Message.EVENT_BUFFER_CONFIGURATION]);
  }

  getChannelStatus(channel) {

    return this.sendMessage(new RequestMessage(channel, Message.CHANNEL_STATUS), Message.MESSAGE[Message.CHANNEL_STATUS], channel);
  }

  // Spec p. 75 "If supported, when this setting is enabled ANT will include the channel ID, RSSI, or timestamp data with the messages"
  // 0 - Disabled, 0x20 = Enable RX timestamp output, 0x40 - Enable RSSI output, 0x80 - Enabled Channel ID output
  libConfig(libConfig) {

    return this.sendMessage(new LibConfigMessage(libConfig), this.constructor.EVENT.OK, 0);
  }

  // Unassign a channel. A channel must be unassigned before it may be reassigned. (spec p. 63)
  unAssignChannel(channel) {

    return this.sendMessage(new UnAssignChannelMessage(channel), this.constructor.EVENT.OK, channel);
  }

  /* Reserves channel number and assigns channel type and network number to the channel, sets all other configuration parameters
     to defaults. Assign channel command should be issued before any other channel configuration messages
     (p. 64 ANT Message Protocol And Usaga Rev 50) -> also sets defaults values for RF, period, tx power, search timeout p.22 */
  assignChannel(channel, channelType, networkNumber, extendedAssignment) {
    const configurationMsg = extendedAssignment === undefined ?
      new AssignChannelMessage(channel, channelType, networkNumber) :
      new AssignChannelMessage(channel, channelType, networkNumber, extendedAssignment);

    return this.sendMessage(configurationMsg, this.constructor.EVENT.OK, channel);

  }

  /* Master: id transmitted along with messages Slave: sets channel ID to match the master it wishes to find,
   0 = wildcard "When the device number is fully known the pairing bit is ignored" (spec. p. 65)
  */
  setChannelId(channel, deviceNum, deviceType, transmissionType) {

    return this.sendMessage(new SetChannelIDMessage(channel, deviceNum, deviceType, transmissionType), this.constructor.EVENT.OK, channel);
  }

  // Uses the lower 2 bytes of the device serial number as channel Id.
  setSerialNumChannelId(channel, deviceType, transmissionType) {

    return this.sendMessage(new SetSerialNumChannelIdMessage(channel, deviceType, transmissionType), this.constructor.EVENT.OK, channel);
  }

  setChannelPeriod(channel, messagePeriod) {

    return this.sendMessage(new SetChannelPeriodMessage(channel, messagePeriod), this.constructor.EVENT.OK, channel);
  }

  // Low priority search mode
  // Spec. p. 72 : "...a low priority search will not interrupt other open channels on the device while searching",
  // "If the low priority search times out, the module will switch to high priority mode"
  setLowPriorityChannelSearchTimeout(channel, searchTimeout) {
    // Timeout in sec. : ucSearchTimeout * 2.5 s, 255 = infinite, 0 = disable low priority search

    return this.sendMessage(new SetLowPriorityChannelSearchTimeoutMessage(channel, searchTimeout), this.constructor.EVENT.OK, channel);
  }

  // Set High priority search timeout, each count in searchTimeout = 2.5 s, 255 = infinite,
  //0 = disable high priority search mode (default search timeout is 25 seconds)
  setChannelSearchTimeout(channel, searchTimeout) {

    return this.sendMessage(new SetChannelSearchTimeoutMessage(channel, searchTimeout), this.constructor.EVENT.OK, channel);
  }

  // Set the RF frequency, i.e 66 = 2466 MHz
  setChannelRFFreq(channel, RFFreq) {

    return this.sendMessage(new SetChannelRFFreqMessage(channel, RFFreq), this.constructor.EVENT.OK, channel);
  }

  // Set network key for specific net
  setNetworkKey(netNumber, key) {

    return this.sendMessage(new SetNetworkKeyMessage(netNumber, key), this.constructor.EVENT.OK, 0);
  }

  // Set search waveform individual channel
  setSearchWaveform(channel, searchWaveform) {

    return this.sendMessage(new SetSearchWaveformMessage(channel, searchWaveform), this.constructor.EVENT.OK, channel);
  }

  // Set transmit power for all channels
  setTransmitPower(transmitPower) {

    return this.sendMessage(new SetTransmitPowerMessage(transmitPower), this.constructor.EVENT.OK, 0);
  }

  // Set transmit power for individual channel
  setChannelTxPower(channel, transmitPower) {

    return this.sendMessage(new SetChannelTxPowerMessage(channel, transmitPower), this.constructor.EVENT.OK, channel);
  }

  // "Enabled a one-time proximity requirement for searching. Once a proximity searh has been successful, this threshold value will be cleared" (spec. p. 76)
  setProximitySearch(channel, searchThreshold) {

    return this.sendMessage(new SetProximitySearchMessage(channel, searchThreshold), this.constructor.EVENT.OK, channel);
  }

  // Higher search priority pre-empts lower priority search channels (spec 9.5.2.24), 0..255
  setChannelSearchPriority(channel, searchPriority) {

    return this.sendMessage(new SetChannelSearchPriorityMessage(channel, searchPriority), this.constructor.EVENT.OK, channel);
  }

  // Scan mode always uses channel 0 (spec 9.5.4.5)
  openRxScanMode(syncChannelPacketsOnly) {

    return this.sendMessage(new OpenRxScanModeMessage(syncChannelPacketsOnly), this.constructor.EVENT.OK, 0);
  }

  // Opens a previously assigned and configured channel. Data messages or events begins to be issued. (spec p. 88)
  openChannel(channel) {

    return this.sendMessage(new OpenChannelMessage(channel), this.constructor.EVENT.OK, channel);
  }

  // Close a channel that has been previously opened. Channel still remains assigned and can be reopened at any time. (spec. p 88)
  closeChannel(channel) {

    // Wait for EVENT_CHANNEL_CLOSED ?
    // If channel status is tracking -> can get broadcast data packet before event channel closed packet

    return this.sendMessage(new CloseChannelMessage(channel), this.constructor.EVENT.OK, channel);

  }

}

export default function(Host) {
  for (const methodName of Object.getOwnPropertyNames(HostCommands.prototype)) {
    if (methodName !== 'constructor') {
      Host.prototype[methodName] = HostCommands.prototype[methodName];
    }
  }
};
