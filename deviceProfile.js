// Based on https://developer.mozilla.org/en-US/docs/JavaScript/Introduction_to_Object-Oriented_JavaScript
function DeviceProfile(nodeInstance) {
    this.nodeInstance = nodeInstance;
}

DeviceProfile.prototype = {

    DEVICE_TYPE: 0x00,

    parseBurstData: function (channelNr, data) {
        console.log("Parse burst data", data);
    },

    channelResponseEvent: function (data) {
        console.log("Channel response/event : ", data);
        //return "Not defined";
    },

    getSlaveChannelConfiguration: function () {
        return "Not defined";
    },

    getMasterChannelConfiguration: function () {
        return "Not defined";
    },

    broadCastDataParser: function (data) {
        console.log(Date.now()+"Broadcast RX : ", data);
    },

    channelResponseEvent: function (data) {
        console.log(Date.now() + "Response/Event RX : ", data);
    }
};

module.exports = DeviceProfile;
