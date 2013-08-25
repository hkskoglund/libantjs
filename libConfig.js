// Function names based on Dynastram Android SDK v 4.00 documentation
// Support object to be used as parameter to LibConfigMessage (use .getFlagsByte() as param.)
function LibConfig(enableChannelId, enableRSSI, enableRXTimestamp) {

    this.enableChannelId = (enableChannelId > 0);
    this.enableRSSI = (enableRSSI > 0);
    this.enableRXTimestamp = (enableRXTimestamp > 0);
    
    if (this.enableChannelId)
        this.flagsByte = LibConfig.prototype.Flag.CHANNEL_ID_ENABLED;

    if (this.enableRSSI)
        this.flagsByte = this.flagsByte | LibConfig.prototype.Flag.RSSI_ENABLED;

    if (this.enableRXTimestamp)
        this.flagsByte = this.flagsByte | LibConfig.prototype.Flag.RX_TIMESTAMP_ENABLED;
}

LibConfig.prototype.setFlagsByte = function (value) {
    
    this.flagsByte = value;

    if (this.flagsByte & LibConfig.prototype.Flag.CHANNEL_ID_ENABLED)
        this.enableChannelId = true;

    if (this.flagsByte & LibConfig.prototype.Flag.RSSI_ENABLED)
        this.enableRSSI = true;

    if (this.flagsByte & LibConfig.prototype.Flag.RX_TIMESTAMP_ENABLED)
        this.enableRXTimestamp = true;

}

LibConfig.prototype.getFlagsByte = function () {
    return this.flagsByte;
}

LibConfig.prototype.getEnableChannelId = function () {
    return this.enableChannelID;
}

LibConfig.prototype.getEnableRSSI = function () {
    return this.enableRSSI;
}

LibConfig.prototype.getEnableRSSI = function () {
    return this.enableRXTimestamp;
}

LibConfig.prototype.setEnableChannelId = function (value) {
    this.enableChannelID = value;
}

LibConfig.prototype.setEnableRSSI = function (value) {
    this.enableRSSI = value;
}

LibConfig.prototype.getEnableRSSI = function (value) {
    this.enableRXTimestamp = value;
}

LibConfig.prototype.Flag = {
    DISABLED: 0x00,
    CHANNEL_ID_ENABLED: 0x20, // 00100000
    RSSI_ENABLED: 0x40,      // 01000000
    RX_TIMESTAMP_ENABLED: 0x80 // 10000000
}

LibConfig.prototype.toString = function () {
    
    var msg = "LIBCONFIG";

    if (this.enableChannelId)
        msg += " Channel ID";

    if (this.enableRSSI)
        msg += " RSSI";

    if (this.enableRXTimestamp)
        msg += " RX timestamp";

    return msg;
}

module.exports = LibConfig;