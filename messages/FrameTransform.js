"use strict"

var Transform = require('stream').Transform,
    ANTMessage = require('./ANTMessage.js');


/* Standard message :
       SYNC MSGLENGTH MSGID CHANNELNUMBER PAYLOAD (8 bytes) CRC
 */

function initStream() {
   
    // Object mode is enabled to allow for passing message objects downstream/TX, from here the message is transformed into a buffer and sent down the pipe to usb
    // Sending directly to the usb stream as a buffer would have been somewhat more performant
    this._stream = new Transform({ objectMode: true });

    this._stream._transform = function _transform(message, encoding, callback) {
        this._stream.push(message.getRawMessage()); 
        callback();
    }.bind(this);

    //this._stream.on('readable',function _readable()
    //{
    //    console.log("Transform readable",arguments);
    //}.bind(this));

    

    //this._outStream.on('end', function () {
    //    console.log("ANTMESSAGE stream END", arguments);
    //});
}

// Adds SYNC LENGTH ... CRC
function FrameTransform () {
    //console.log("ANTMESSAGE", ANTMessage);
    initStream.bind(this)();
   
}

FrameTransform.prototype.getStream = function () {
    return this._stream;
}

module.exports = FrameTransform;