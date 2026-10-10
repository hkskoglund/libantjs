'use strict';
import Logger from '../util/logger.js';
import EventEmitter from 'node:events';
import ChannelId from './channel-id.js';



class Channel extends EventEmitter {
  constructor(options, host, channelNumber, net, type) {

    super(options);

    this.option = Object.assign({}, options);

    this.log = this.option.logger || new Logger(
      Object.assign({}, this.option, { logSource: this })
    );

    this.host = host; // Allows access to host API for channel (wrappers)

    this.channel = channelNumber;

    this.net = net || 0;

    this.key = this.constructor.NET.KEY.PUBLIC;

    this.type = type || this.constructor.BIDIRECTIONAL_SLAVE;

    this.id = this.getWildcardId();

    this.frequency = this.constructor.NET.FREQUENCY.DEFAULT;

    this.period = this.constructor.NET.PERIOD.DEFAULT;

    this.burst = undefined; // Contains aggregated burst data

    this.on('EVENT_TRANSFER_TX_COMPLETED', Channel.prototype.onTxCompleted);
    this.on('EVENT_TRANSFER_TX_FAILED', Channel.prototype.onTxFailed);
    this.on('EVENT_RX_FAIL_GO_TO_SEARCH', Channel.prototype.onRxFailGoToSearch);
    this.on('data', Channel.prototype.onBroadcast);
    this.on('burst', Channel.prototype.onBurst);
  }

  getExtendedAssignment() {

    var msg = '',
      getStatus = function(flag, str) {
        var msg = '';
        msg += ((this.extendedAssignment & flag) !== 0) ? '+' : '-';
        msg += str;

        return msg;
      }.bind(this);

    msg += getStatus(Channel.BACKGROUND_SCANNING_ENABLE, 'Background Scanning|');
    msg += getStatus(Channel.FREQUENCY_AGILITY_ENABLE, 'Frequency Agility|');
    msg += getStatus(Channel.FAST_CHANNEL_INITIATION_ENABLE, 'Fast Channel Initiation|');
    msg += getStatus(Channel.ASYNCHRONOUS_TRANSMISSION_ENABLE, 'Asynchronous Transmission|');
    msg += this.extendedAssignment.toString(2) + 'b';

    return msg;
  }

  onBurst(burst) {

    this.state = this.constructor.TRACKING;
  }

  onBroadcast(broadcast) {

    this.state = this.constructor.TRACKING;
  }

  onRxFailGoToSearch() {

    this.state = this.constructor.SEARCHING;

    if (this.log.logging)
       this.log.debug( 'Lost contact with client, searching.');
  }

  onTxCompleted(e, m) {

    this.transferInProgress = false;
  }

  onTxFailed(e, m) {

    this.transferInProgress = false;
  }

  isTransferInProgress() {

    return this.transferInProgress;
  }

  isTracking() {

    return this.state === this.constructor.TRACKING;
  }

  getWildcardId() {

    return new ChannelId(0,0,0);
  }

  getSerialNumber() {

    return this.host.getSerialNumber();
  }

  async connect() {

    await this.setNetworkKey(this.key);
    await this.slave();
    await this.setId(this.id);
    await this.setFrequency(this.frequency);
    await this.setPeriod(this.period);
    await this.setLowPriorityTimeout(this.lowPrioritySearchTimeout);

    return this.open();
  }

  setNetworkKey(key) {

    this.key = key;

    return this.host.setNetworkKey(this.net, this.key);
  }

  slave() {

    return this.assign(this.constructor.BIDIRECTIONAL_SLAVE, this.net);
  }

  slaveOnly() {

    return this.assign(this.constructor.SLAVE_RECEIVE_ONLY, this.net);
  }

  master() {

    return this.assign(this.constructor.BIDIRECTIONAL_MASTER, this.net);
  }

  masterOnly() {

    return this.assign(this.constructor.MASTER_TRANSMIT_ONLY, this.net);
  }

  assign(type, net, extendedAssignment) {

    this.type = type;
    this.net = net;

    if (typeof extendedAssignment === 'number') {
      this.extendedAssignment = extendedAssignment;
    }

    return this.host.assignChannel(this.channel, this.type, this.net, extendedAssignment);
  }

  unassign() {

    this.type = undefined;

    return this.host.unAssignChannel(this.channel);
  }

  setId(deviceNumber, deviceType, transmissionType) {

    if (deviceNumber instanceof ChannelId) {
      this.id = deviceNumber;
    } else {
      this.id = new ChannelId(deviceNumber, deviceType, transmissionType);
    }

    return this.host.setChannelId(this.channel, this.id.deviceNumber, this.id.deviceType, this.id.transmissionType);
  }

  async getId() {

    const channelId = await this.host.getChannelId(this.channel);

    this.id = channelId;

    return channelId;
  }

  setFrequency(frequencyOffset) {

    this.frequency = frequencyOffset;

    return this.host.setChannelRFFreq(this.channel, frequencyOffset);
  }

  setPeriod(period) {

    this.period = period;

    return this.host.setChannelPeriod(this.channel, period);
  }

  setLowPriorityTimeout(timeout) {

    this.lowPrioritySearchTimeout = timeout;
    return this.host.setLowPriorityChannelSearchTimeout(this.channel, this.lowPrioritySearchTimeout);
  }

  setSearchPriority(searchPriority) {

    this.searchPriority = searchPriority;
    return this.host.setChannelSearchPriority(this.channel, searchPriority);
  }

  addChannelId(deviceNum, deviceType, transmissionType, listIndex) {

    return this.host.addChannelId(this.channel, deviceNum, deviceType, transmissionType, listIndex);
  }

  configIdList(listSize, exclude) {

    return this.host.configIdList(this.channel, listSize, exclude);
  }

  configFrequencyAgility(frequency1, frequency2, frequency3) {

    return this.host.configFrequencyAgility(this.channel, frequency1, frequency2, frequency3);
  }

  setSearchSharing(searchSharingCycles) {

    return this.host.setChannelSearchSharing(this.channel, searchSharingCycles);
  }

  configSelectiveDataUpdate(maskNumber, includeAcknowledged) {

    return this.host.configSelectiveDataUpdate(this.channel, maskNumber, includeAcknowledged);
  }

  disableSelectiveDataUpdate() {

    return this.host.disableSelectiveDataUpdate(this.channel);
  }

  async open() {

    const response = await this.host.openChannel(this.channel);

    this.host.emit('open', this.channel);

    return response;
  }

  openScan(syncChannelPacketsOnly) {

    return this.host.openRxScanMode(syncChannelPacketsOnly);
  }

  close() {

    return this.host.closeChannel(this.channel);
  }

  async getStatus() {

    const status = await this.host.getChannelStatus(this.channel);

    this.state = status.state;
    this.type = status.type;
    this.net = status.net;

    return status;
  }

  hasId() {

    return (this.id.deviceNumber !== 0) && (this.id.deviceType !== 0) && (this.id.transmissionType !== 0);
  }

  send(broadcastData) {

    return this.host.sendBroadcastData(this.channel, broadcastData);
  }

  sendExtended(channelId, broadcastData) {

    return this.host.sendExtendedBroadcastData(this.channel, channelId, broadcastData);
  }

  async sendExtendedAcknowledged(channelId, ackData) {

    this.transferInProgress = true;

    try {
      return await this.host.sendExtendedAcknowledgedData(this.channel, channelId, ackData);
    } catch (error) {
      this.transferInProgress = false;
      throw error;
    }
  }

  async sendAcknowledged(ackData) {

    this.transferInProgress = true;

    try {
      return await this.host.sendAcknowledgedData(this.channel, ackData);
    } catch (error) {
      this.transferInProgress = false;
      throw error;
    }
  }

  async sendBurst(burstData, packetsPerURB = 1) {

    this.transferInProgress = true;

    try {
      return await this.host.sendBurstTransfer(this.channel, burstData, packetsPerURB);
    } catch (error) {
      this.transferInProgress = false;
      throw error;
    }
  }

  toString() {

    var msg = 'Ch ' + this.channel + ' |';

    if (typeof this.net === 'number')
      msg += 'Net ' + this.net + '|';

    if (typeof this.type === 'number')
      msg += Channel.TYPE[this.type] + '|';

    if (this.id)
      msg += this.id.toString() + '|';

    if (this.frequency) {
      msg += ' ' + (2400 + this.frequency) + 'MHz' + '|';
    }

    if (this.period) {
      msg += ' period ' + this.period + '|';
    }

    if (typeof this.state === 'number') // Search etc.
    {
      msg += Channel.STATE[this.state] + '|';
    }

    return msg;
  }

  static UNASSIGNED = 0x00;
  static ASSIGNED = 0x01;
  static SEARCHING = 0x02;
  static TRACKING = 0x03;
  static STATE = {
  0x00: 'Unassigned',
  0x01: 'Assigned',
  0x02: 'Searching',
  0x03: 'Tracking'
};
  static BIDIRECTIONAL_SLAVE = 0x00;
  static BIDIRECTIONAL_MASTER = 0x10;
  static SHARED_BIDIRECTIONAL_SLAVE = 0x20;
  static SHARED_BIDIRECTIONAL_MASTER = 0x30;
  static SLAVE_RECEIVE_ONLY = 0x40;
  static MASTER_TRANSMIT_ONLY = 0x50;
  static TYPE = {
  0x00: 'Bidirectional SLAVE',
  0x10: 'Bidirectional MASTER',
  0x20: 'Shared bidirectional SLAVE',
  0x30: 'Shared bidirectional MASTER',
  0x40: 'SLAVE receive only (diagnostic)',
  0x50: 'MASTER Transmit only (legacy)'
};
  static NET = {
  PERIOD: {
    DEFAULT : 8192,  // 4 Hz
    ANTFS : 4096,    // 8 Hz
    'ENVIRONMENT': {
      LOW_POWER: 65535  // 0.5 Hz
    }
  },
  FREQUENCY: {
    DEFAULT : 66, // 2466 MHz
    'ANT+': 57,
    ANTFS : 50,
  },
  KEY: {
    PUBLIC  : [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], // Default
    'ANT+'  : [0xB9, 0xA5, 0x21, 0xFB, 0xBD, 0x72, 0xC3, 0x45],
    ANTFS   : [0xa8, 0xa4, 0x23, 0xb9, 0xf5, 0x5e, 0x63, 0xc1]
  }
};
  static EVENT = {
  BURST: 'burst' // Total burst, i.e all burst packets
};
  static BACKGROUND_SCANNING_ENABLE = 0x01;
  static FREQUENCY_AGILITY_ENABLE = 0x04;
  static FAST_CHANNEL_INITIATION_ENABLE = 0x10;
  static ASYNCHRONOUS_TRANSMISSION_ENABLE = 0x20;
  static MAX_RF = 124;
}
























 // 0000 0001
 // 0000 0100
 // 0001 0000
 // 0010 0000



// Data

export default Channel;
