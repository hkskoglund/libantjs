'use strict';
import DeviceProfile from '../device-profile.js';
import SDMPage1 from './sdm-page1.js';
import SDMPage2 from './sdm-page2.js';
import SDMPage3 from './sdm-page3.js';



  class DeviceProfile_SDM extends DeviceProfile {
  constructor(configuration) {


    super(configuration);

    this.addConfiguration("slave", {
      description: "Slave configuration for ANT+ SDM device profile",
      networkKey: setting.networkKey["ANT+"],
      //channelType: Channel.prototype.TYPE.BIDIRECTIONAL_SLAVE_CHANNEL,
      channelType: "slave",
      channelId: {
        deviceNumber: '*',
        deviceType: DeviceProfile_SDM.CHANNEL_ID.DEVICE_TYPE,
        transmissionType: '*'
      },
      RFfrequency: setting.RFfrequency["ANT+"], // 2457 Mhz ANT +

      channelPeriod: DeviceProfile_SDM.CHANNEL_PERIOD

    });

    this.addConfiguration("master", {
      description: "Master configuration for ANT+ SDM device profile",
      networkKey: setting.networkKey["ANT+"],

      channelType: "master",
      channelId: {
        deviceNumber: 'serial number',
        deviceType: DeviceProfile_SDM.CHANNEL_ID.DEVICE_TYPE,
        transmissionType: DeviceProfile_SDM.CHANNEL_ID.TRANSMISSION_TYPE
      },
      RFfrequency: setting.RFfrequency["ANT+"], // 2457 Mhz ANT +

      channelPeriod: DeviceProfile_SDM.CHANNEL_PERIOD

    });

    // Minimize GC
    this.SDMPage1 = new SDMPage1(configuration);
    this.SDMPage2 = new SDMPage2(configuration);
    this.SDMPage3 = new SDMPage3(configuration);
  }

  broadCast(broadcast) {

    var page,
      pageNumber = broadcast.data[0],
      sensorId = broadcast.channelId.sensorId,
      BROADCAST_LIMIT_BEFORE_UI_UPDATE = 4; // ca 1 second with ca 4 Hz period

    // Don't process broadcast with wrong device type
    if (!this.verifyDeviceType(DeviceProfile_SDM.CHANNEL_ID.DEVICE_TYPE, broadcast))
      return;

    this.countBroadcast(sensorId);

    // Don't process duplicate broadcast
    if (this.isDuplicateMessage(broadcast)) {


      return;

    }

    switch (pageNumber) {


      case 1:

        page = this.SDMPage1;
        page.decode(broadcast);

        break;


      case 2:

        page = this.SDMPage2;
        page.decode(broadcast);

        break;

      case 3:

        page = this.SDMPage3;
        page.decode(broadcast);

        break;

      default:

        page = this.getBackgroundPage(broadcast, pageNumber);

        break;

    }

    if (page) {

      page.timestamp = Date.now();

      if (this.log.logging) this.log.info( sensorId + ' B#' + this.receivedBroadcastCounter[sensorId], page, page.toString());

      if (this.receivedBroadcastCounter[sensorId] >= BROADCAST_LIMIT_BEFORE_UI_UPDATE)
        this.onPage(page);
      else if (this.log.logging)
        this.log.warn( 'Skipping page, broadcast for SDM sensor ' + sensorId + ' is ' + this.receivedBroadcastCounter[sensorId] + ' which is  threshold for UI update ' + BROADCAST_LIMIT_BEFORE_UI_UPDATE);

    }
  }

  static NAME = 'SDM';
  static CHANNEL_ID = {
    DEVICE_TYPE: 0x7C,
    TRANSMISSION_TYPE: 5
  };
  static CHANNEL_PERIOD = 8134;
  static ALTERNATIVE_CHANNEL_PERIOD = 16268;
}




   // 4 hz

   // 2 Hz



  export default DeviceProfile_SDM;
