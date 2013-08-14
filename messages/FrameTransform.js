"use strict"

var Transform = require('stream').Transform,
    ANTMessage = require('./ANTMessage.js');


/* Standard message :
       SYNC MSGLENGTH MSGID CHANNELNUMBER PAYLOAD (8 bytes) CRC
 */

function initStream() {
    var rawMsg;
    this._stream = new Transform();

    this._stream._transform = function _transform(payload, encoding, callback) {
        //console.log(this);
        //rawMsg = this.message.create(payload);
        //console.log("OUT Transforming ", payload, "to", rawMsg);
        this._stream.push(payload); // ECHO
        
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

function FrameTransform () {
    //console.log("ANTMESSAGE", ANTMessage);
    initStream.bind(this)();
    this.message = new ANTMessage();
   
}

FrameTransform.prototype.getStream = function () {
    return this._stream;
}

module.exports = FrameTransform;