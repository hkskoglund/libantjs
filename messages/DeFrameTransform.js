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
        console.log("Deframing ", payload);
        console.log(this);
        process.exit();
        //this._stream.write(payload); // ECHO


        // callback();
    }.bind(this);

    this._stream._read = function () {
        // console.log("Deframing _read");
    }.bind(this);

    this._stream._write = function (payload, encoding, nextCB) {
        // console.log("Deframing _write", arguments);
        this._stream.push(payload);
        nextCB();
    }.bind(this);

    //this._stream.on('readable', function _readable() {
    //    console.log("DeFrameTransform has readable", arguments);
    //   // this._stream.read(); // SINK
    //}.bind(this));

}

function DeFrameTransform() {
    //console.log("ANTMESSAGE", ANTMessage);
    initStream.bind(this)();
    this.message = new ANTMessage();

}

DeFrameTransform.prototype.getStream = function () {
    return this._stream;
}

module.exports = DeFrameTransform;