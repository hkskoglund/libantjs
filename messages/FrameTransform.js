"use strict"

var Transform = require('stream').Transform,
    ANTMessage = require('./ANTMessage.js'),
    util = require('util');

util.inherits(FrameTransform, Transform);

function FrameTransform (options) {
    Transform.call(this,options);
}

// Callback from node.js stream API convert message object to byte stream for further processing by libusb
FrameTransform.prototype._transform = function _transform(message, encoding, callback) {
    this.push(message.getRawMessage()); 
    callback();
};

module.exports = FrameTransform;