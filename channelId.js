function ChannelId(deviceNumber, deviceType, transmissionType, pair) {
    
    this.deviceNumber = deviceNumber;
    this.deviceType = deviceType;
    this.transmissionType = transmissionType;

    if (pair) // Set bit 7 high if pairing is wanted
        this.deviceType = this.deviceType | ChannelId.prototype.BITMASK_PAIR;

    this.pair = (this.deviceType & ChannelId.prototype.BITMASK_PAIR > 0) ? true : false;
}

ChannelId.prototype.getDeviceNumber = function () {
    return this.deviceNumber;
}

ChannelId.prototype.getDeviceType = function () {
    return this.deviceType;
}

ChannelId.prototype.getTransmissionType = function () {
    return this.transmissionType;
}

ChannelId.prototype.getPair = function () {
    return this.pair;
}

// Inline with Android Dynastream SDK
ChannelId.prototype.BITMASK_PAIR = parseInt("10000000", 2);
ChannelId.prototype.ANY_DEVICE_NUMBER = 0x00;
ChannelId.prototype.ANY_DEVICE_TYPE = ChannelId.prototype.ANY_DEVICE_NUMBER;
ChannelId.prototype.ANY_TRANSMISSION_TYPE = ChannelId.prototype.ANY_DEVICE_NUMBER;

ChannelId.prototype.toString = function () {
    
    return "ChannelID " + this.deviceNumber + "," + this.deviceType + "," + this.transmissionType  + " "+this.pair;
}

module.exports = ChannelId;