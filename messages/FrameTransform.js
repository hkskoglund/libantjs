"use strict"

var Transform = require('stream').Transform,
    ANTMessage = require('./ANTMessage.js'),
    util = require('util');

function FrameTransform (options) {
    Transform.call(this,options);
}

util.inherits(FrameTransform, Transform);

// Callback from node.js stream API convert message object to byte stream for further processing by libusb
FrameTransform.prototype._transform = function _transform(message, encoding, callback) {
    var overflow;
    if (typeof message.getRawMessage === "function") {
        overflow = !this.push(message.getRawMessage());
        if (overflow)
            console.log("FrameTransform: Stream indicate overflow, pushing data beyond highWaterMark");
    }
    else
        throw new Error('Message object has no getRawMessage function to convert message into bytes');

    callback();
};

module.exports = FrameTransform;