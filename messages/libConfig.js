/* global define: true */

//if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {
    'use strict';
// Function names based on Dynastram Android SDK v 4.00 documentation
// Support object to be used as parameter to LibConfigMessage (use .getFlagsByte() as param.)
function LibConfig(enableChannelId, enableRSSI, enableRXTimestamp) {

    this.enableChannelId = (enableChannelId > 0);
    this.enableRSSI = (enableRSSI > 0);
    this.enableRXTimestamp = (enableRXTimestamp > 0);
    
    this._updateFlags = function () {
    if (this.enableChannelId)
        this.flagsByte = LibConfig.prototype.Flag.CHANNEL_ID_ENABLED;

    if (this.enableRSSI)
        this.flagsByte = this.flagsByte | LibConfig.prototype.Flag.RSSI_ENABLED;

    if (this.enableRXTimestamp)
        this.flagsByte = this.flagsByte | LibConfig.prototype.Flag.RX_TIMESTAMP_ENABLED;
};

    this._updateFlags();
}


LibConfig.prototype.setFlagsByte = function (value) {
    
    this.flagsByte = value;

    if (this.flagsByte & LibConfig.prototype.Flag.CHANNEL_ID_ENABLED)
        this.enableChannelId = true;

    if (this.flagsByte & LibConfig.prototype.Flag.RSSI_ENABLED)
        this.enableRSSI = true;

    if (this.flagsByte & LibConfig.prototype.Flag.RX_TIMESTAMP_ENABLED)
        this.enableRXTimestamp = true;

};

LibConfig.prototype.getFlagsByte = function () {
    return this.flagsByte;
};

LibConfig.prototype.getEnableChannelId = function () {
    return this.enableChannelID;
};

LibConfig.prototype.getEnableRSSI = function () {
    return this.enableRSSI;
};

LibConfig.prototype.getEnableRSSI = function () {
    return this.enableRXTimestamp;
};

LibConfig.prototype.setEnableChannelId = function () {
    this.enableChannelId = true;
    this._updateFlags();
};

LibConfig.prototype.setEnableRSSI = function () {
    this.enableRSSI = true;
    this._updateFlags();
};

LibConfig.prototype.setEnableRXTimestamp = function () {
    this.enableRXTimestamp = true;
    this._updateFlags();
};

LibConfig.prototype.Flag = {
    DISABLED: 0x00,
    CHANNEL_ID_ENABLED: 0x20, // 00100000
    RSSI_ENABLED: 0x40,      // 01000000
    RX_TIMESTAMP_ENABLED: 0x80 // 10000000
};

LibConfig.prototype.toString = function () {
    
    var msg = "Library configured for extended messaging (LIBCONFIG) :";

    if (this.enableChannelId)
        msg += " ChannelID";

    if (this.enableRSSI)
        msg += " RSSI";

    if (this.enableRXTimestamp)
        msg += " RXtimestamp";

    return msg;
};

module.exports = LibConfig;
    return module.exports;
});
