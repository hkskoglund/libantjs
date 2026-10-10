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
import AddChannelIdMessage from '../messages/configuration/add-channel-id-message.js';
import ConfigIdListMessage from '../messages/configuration/config-id-list-message.js';
import EnableExtRxMessagesMessage from '../messages/configuration/enable-ext-rx-messages-message.js';
import EnableLedMessage from '../messages/configuration/enable-led-message.js';
import EnableCrystalMessage from '../messages/configuration/enable-crystal-message.js';
import ConfigFrequencyAgilityMessage from '../messages/configuration/config-frequency-agility-message.js';
import Set128BitNetworkKeyMessage from '../messages/configuration/set-128-bit-network-key-message.js';
import AddEncryptionIdMessage from '../messages/configuration/add-encryption-id-message.js';
import EnableChannelEncryptionMessage from '../messages/configuration/enable-channel-encryption-message.js';
import SetEncryptionKeyMessage from '../messages/configuration/set-encryption-key-message.js';
import SetEncryptionInfoMessage from '../messages/configuration/set-encryption-info-message.js';
import CryptoKeyNvmOpMessage from '../messages/configuration/crypto-key-nvm-op-message.js';
import ConfigHighDutySearchMessage from '../messages/configuration/config-high-duty-search-message.js';
import SetChannelSearchSharingMessage from '../messages/configuration/set-channel-search-sharing-message.js';
import SetUsbDescriptorStringMessage from '../messages/configuration/set-usb-descriptor-string-message.js';
import InitCwTestModeMessage from '../messages/test-mode/init-cw-test-mode-message.js';
import CwTestModeMessage from '../messages/test-mode/cw-test-mode-message.js';
import ConfigEventFilterMessage from '../messages/configuration/config-event-filter-message.js';
import ConfigSelectiveDataUpdateMessage from '../messages/configuration/config-selective-data-update-message.js';
import SetSduMaskMessage from '../messages/configuration/set-sdu-mask-message.js';
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

  // Add a Channel ID to the inclusion/exclusion list of a slave channel, index 0..3 (spec 9.5.2.10)
  addChannelId(channel, deviceNum, deviceType, transmissionType, listIndex) {

    return this.sendMessage(new AddChannelIdMessage(channel, deviceNum, deviceType, transmissionType, listIndex), this.constructor.EVENT.OK, channel);
  }

  // Activate the ID list: listSize 0..4 entries, exclude = false for an inclusion list (spec 9.5.2.12)
  configIdList(channel, listSize, exclude) {

    return this.sendMessage(new ConfigIdListMessage(channel, listSize, exclude), this.constructor.EVENT.OK, channel);
  }

  // Legacy extended messaging, only the channel ID is added to received data (spec 9.5.2.17); prefer libConfig
  enableExtRxMessages(enable) {

    return this.sendMessage(new EnableExtRxMessagesMessage(enable), this.constructor.EVENT.OK, 0);
  }

  enableLed(enable) {

    return this.sendMessage(new EnableLedMessage(enable), this.constructor.EVENT.OK, 0);
  }

  // Enables the external 32 kHz crystal (spec 9.5.2.19)
  enableCrystal() {

    return this.sendMessage(new EnableCrystalMessage(), this.constructor.EVENT.OK, 0);
  }

  // Frequencies 0..124, requires frequency agility in the extended assignment byte of assignChannel (spec 9.5.2.21)
  configFrequencyAgility(channel, frequency1, frequency2, frequency3) {

    return this.sendMessage(new ConfigFrequencyAgilityMessage(channel, frequency1, frequency2, frequency3), this.constructor.EVENT.OK, channel);
  }

  // Multi-mode devices only; the response channel byte carries the network number
  set128BitNetworkKey(netNumber, key) {

    return this.sendMessage(new Set128BitNetworkKeyMessage(netNumber, key), this.constructor.EVENT.OK, netNumber);
  }

  // Single channel encryption (spec 5.5.1). Set the key and encryption ID first, advanced burst must be enabled.
  // The response channel byte of messages without a channel carries the first content byte.
  setEncryptionKey(volatileKeyIndex, key) {

    return this.sendMessage(new SetEncryptionKeyMessage(volatileKeyIndex, key), this.constructor.EVENT.OK, volatileKeyIndex);
  }

  // parameter: SetEncryptionInfoMessage.ENCRYPTION_ID (4 bytes), USER_INFORMATION_STRING (19), RANDOM_NUMBER_SEED (16)
  setEncryptionInfo(parameter, data) {

    return this.sendMessage(new SetEncryptionInfoMessage(parameter, data), this.constructor.EVENT.OK, parameter);
  }

  // mode 0 = disable, 1 = enable, 2 = enable and include user information string; decimation rate is 1 on a master
  enableChannelEncryption(channel, mode, volatileKeyIndex, decimationRate) {

    return this.sendMessage(new EnableChannelEncryptionMessage(channel, mode, volatileKeyIndex, decimationRate), this.constructor.EVENT.OK, channel);
  }

  // Encrypted master channels, index 0..3 (spec 9.5.2.11)
  addEncryptionId(channel, encryptionId, listIndex) {

    return this.sendMessage(new AddEncryptionIdMessage(channel, encryptionId, listIndex), this.constructor.EVENT.OK, channel);
  }

  // Whitelist (blacklist = false) or blacklist of the first listSize encryption IDs, 0 disables (spec 9.5.2.13)
  configEncryptionIdList(channel, listSize, blacklist) {

    return this.sendMessage(new ConfigIdListMessage(channel, listSize, blacklist), this.constructor.EVENT.OK, channel);
  }

  // parameter: 0 = max supported encryption mode, 1 = encryption ID, 2 = user information string (spec 9.5.7.12)
  getEncryptionParameter(parameter) {

    return this.sendMessage(new RequestMessage(parameter, Message.ENABLE_CHANNEL_ENCRYPTION), Message.MESSAGE[Message.ENABLE_CHANNEL_ENCRYPTION]);
  }

  loadEncryptionKeyFromNvm(nvmKeyIndex, volatileKeyIndex = 0) {

    return this.sendMessage(new CryptoKeyNvmOpMessage(CryptoKeyNvmOpMessage.LOAD, nvmKeyIndex, volatileKeyIndex), this.constructor.EVENT.OK, CryptoKeyNvmOpMessage.LOAD);
  }

  storeEncryptionKeyInNvm(nvmKeyIndex, key) {

    return this.sendMessage(new CryptoKeyNvmOpMessage(CryptoKeyNvmOpMessage.STORE, nvmKeyIndex, key), this.constructor.EVENT.OK, CryptoKeyNvmOpMessage.STORE);
  }

  // suppressionCycle 0..5 in 250 ms steps is optional and not supported by all parts (spec 9.5.2.26)
  configHighDutySearch(enable, suppressionCycle) {

    return this.sendMessage(new ConfigHighDutySearchMessage(enable, suppressionCycle), this.constructor.EVENT.OK, 0);
  }

  // Search cycles to run before alternating between search channels, 0 disables (spec 9.5.2.35)
  setChannelSearchSharing(channel, searchSharingCycles) {

    return this.sendMessage(new SetChannelSearchSharingMessage(channel, searchSharingCycles), this.constructor.EVENT.OK, channel);
  }

  // 0 = VID/PID (4 bytes), 1 = manufacturer, 2 = device, 3 = serial number string (spec 9.5.2.37)
  setUsbDescriptorString(stringNumber, characters) {

    return this.sendMessage(new SetUsbDescriptorStringMessage(stringNumber, characters), this.constructor.EVENT.OK, stringNumber);
  }

  // Only directly after reset (spec 9.5.8.1)
  initCwTestMode() {

    return this.sendMessage(new InitCwTestModeMessage(), this.constructor.EVENT.OK, 0);
  }

  // Unmodulated carrier at 2400 + rfFrequency MHz, transmitPower 0..4 (spec 9.5.8.2)
  setCwTestMode(transmitPower, rfFrequency) {

    return this.sendMessage(new CwTestModeMessage(transmitPower, rfFrequency), this.constructor.EVENT.OK, 0);
  }

  // Bit N of eventFilter prevents event N+1 from being sent to the host, 0 clears the filter (spec 9.5.2.28)
  configEventFilter(eventFilter) {

    return this.sendMessage(new ConfigEventFilterMessage(eventFilter), this.constructor.EVENT.OK, 0);
  }

  // Resolves with the current filter; ANT sends no RESPONSE_NO_ERROR for requests (spec 9.5.7.9)
  getEventFilter() {

    return this.sendMessage(new RequestMessage(0, Message.CONFIG_EVENT_FILTER), Message.MESSAGE[Message.CONFIG_EVENT_FILTER]);
  }

  // Define SDU mask maskNumber: 8 bytes, set bits are compared for changes (spec 9.5.2.30)
  setSduMask(maskNumber, mask) {

    // The response carries the mask number in its channel byte
    return this.sendMessage(new SetSduMaskMessage(maskNumber, mask), this.constructor.EVENT.OK, maskNumber);
  }

  getSduMask(maskNumber) {

    return this.sendMessage(new RequestMessage(maskNumber, Message.SET_SDU_MASK), Message.MESSAGE[Message.SET_SDU_MASK]);
  }

  // Only send data messages when bits selected by the SDU mask change (spec 9.5.2.29); not applied to burst
  configSelectiveDataUpdate(channel, maskNumber, includeAcknowledged) {

    return this.sendMessage(new ConfigSelectiveDataUpdateMessage(channel, maskNumber, includeAcknowledged), this.constructor.EVENT.OK, channel);
  }

  disableSelectiveDataUpdate(channel) {

    return this.sendMessage(ConfigSelectiveDataUpdateMessage.disable(channel), this.constructor.EVENT.OK, channel);
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
