'use strict';

var Message = require('../messages/message'),
  ResetSystemMessage = require('../messages/control/reset-system-message'),
  SleepMessage = require('../messages/control/sleep-message'),
  RequestMessage = require('../messages/control/request-message'),
  ConfigureAdvancedBurstMessage = require('../messages/configuration/configure-advanced-burst-message'),
  ConfigureEventBufferMessage = require('../messages/configuration/configure-event-buffer-message'),
  LibConfigMessage = require('../messages/configuration/lib-config-message'),
  UnAssignChannelMessage = require('../messages/configuration/un-assign-channel-message'),
  AssignChannelMessage = require('../messages/configuration/assign-channel-message'),
  SetChannelIDMessage = require('../messages/configuration/set-channel-id-message'),
  SetSerialNumChannelIdMessage = require('../messages/configuration/set-serial-num-channel-id-message'),
  SetChannelPeriodMessage = require('../messages/configuration/set-channel-period-message'),
  SetLowPriorityChannelSearchTimeoutMessage = require('../messages/configuration/set-low-priority-channel-search-timeout-message'),
  SetChannelSearchTimeoutMessage = require('../messages/configuration/set-channel-search-timeout-message'),
  SetChannelRFFreqMessage = require('../messages/configuration/set-channel-rf-freq-message'),
  SetNetworkKeyMessage = require('../messages/configuration/set-network-key-message'),
  SetSearchWaveformMessage = require('../messages/configuration/set-search-waveform-message'),
  SetTransmitPowerMessage = require('../messages/configuration/set-transmit-power-message'),
  SetChannelTxPowerMessage = require('../messages/configuration/set-channel-tx-power-message'),
  SetProximitySearchMessage = require('../messages/configuration/set-proximity-search-message'),
  OpenRxScanModeMessage = require('../messages/control/open-rx-scan-mode-message'),
  OpenChannelMessage = require('../messages/control/open-channel-message'),
  CloseChannelMessage = require('../messages/control/close-channel-message');

class HostCommands {
  async resetSystem() {
    const DELAY = 500;

    const notificationStartup = await this.sendMessage(new ResetSystemMessage(), Message.prototype.MESSAGE[Message.prototype.NOTIFICATION_STARTUP]);

    if (this.log.logging)
      this.log.debug( 'Waiting ' + DELAY + ' ms after reset system (for post-reset device state)');
    await new Promise((resolve) => setTimeout(resolve, DELAY));

    return notificationStartup;
  }

  sleep() {
    return this.sendMessage(new SleepMessage());
  }

  getChannelId(channel) {

    return this.sendMessage(new RequestMessage(channel, Message.prototype.SET_CHANNEL_ID), Message.prototype.MESSAGE[Message.prototype.SET_CHANNEL_ID]);
  }

  getVersion() {

    return this.sendMessage(new RequestMessage(undefined, Message.prototype.ANT_VERSION), Message.prototype.MESSAGE[Message.prototype.ANT_VERSION]);
  }

  getCapabilities() {

    return this.sendMessage(new RequestMessage(undefined, Message.prototype.CAPABILITIES), Message.prototype.MESSAGE[Message.prototype.CAPABILITIES]);
  }

  getAdvancedBurstCapabilities() {

    return this.sendMessage(new RequestMessage(0x00, Message.prototype.ADVANCED_BURST_CAPABILITIES), Message.prototype.MESSAGE[Message.prototype.ADVANCED_BURST_CAPABILITIES]);
  }

  getAdvancedBurstConfiguration() {

    return this.sendMessage(new RequestMessage(0x01, Message.prototype.ADVANCED_BURST_CAPABILITIES), Message.prototype.MESSAGE[Message.prototype.ADVANCED_BURST_CAPABILITIES]);
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

    return this.sendMessage(new RequestMessage(undefined, Message.prototype.DEVICE_SERIAL_NUMBER), Message.prototype.MESSAGE[Message.prototype.DEVICE_SERIAL_NUMBER]);
  }

  configEventBuffer(config, size, time) {
    return this.sendMessage(new ConfigureEventBufferMessage(config, size, time));
  }

  getEventBufferConfiguration() {

    return this.sendMessage(new RequestMessage(undefined, Message.prototype.EVENT_BUFFER_CONFIGURATION), Message.prototype.MESSAGE[Message.prototype.EVENT_BUFFER_CONFIGURATION]);
  }

  getChannelStatus(channel) {

    return this.sendMessage(new RequestMessage(channel, Message.prototype.CHANNEL_STATUS), Message.prototype.MESSAGE[Message.prototype.CHANNEL_STATUS], channel);
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

  openRxScanMode(channel) {

    return this.sendMessage(new OpenRxScanModeMessage(channel), this.constructor.EVENT.OK, channel);
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

module.exports = function(Host) {
  for (const methodName of Object.getOwnPropertyNames(HostCommands.prototype)) {
    if (methodName !== 'constructor') {
      Host.prototype[methodName] = HostCommands.prototype[methodName];
    }
  }
};
