// Function names based on Dynastram Android SDK v 4.00 documentation
function RXTimestamp(rxTimestamp) {
    this.RX_timestamp = rxTimestamp;
}

RXTimestamp.prototype.parse = function (extendedData) {
    this.RX_timestamp = extendedData.readUInt16LE(0);
}

RXTimestamp.prototype.getRxTimestamp = function () {
    return this.RX_timestamp;
}

RXTimestamp.prototype.toString = function () {
    return "RX Timestamp " + this.RX_timestamp + " " +(this.RX_timestamp / 32768).toFixed(3)+" s";
}

module.exports = RXTimestamp;