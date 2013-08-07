var ANTMessage = require('./ANTMessage.js');

function ResetSystemMessage() {
    ANTMessage.call(this);
    this._rawmessage = this.create_message(ANTMessage.prototype.MESSAGE.reset_system, new Buffer([0]));
}

ResetSystemMessage.prototype = Object.create(ANTMessage.prototype);

ResetSystemMessage.prototype.constructor = ResetSystemMessage;

ResetSystemMessage.prototype.get = function () {
    return this._rawmessage;
}

module.exports = ResetSystemMessage;