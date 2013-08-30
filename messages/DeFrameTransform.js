"use strict"

var Transform = require('stream').Transform,
    ANTMessage = require('./ANTMessage.js'),
    util = require('util');


/* Standard message :
       SYNC MSGLENGTH MSGID CHANNELNUMBER PAYLOAD (8 bytes) CRC
 */

util.inherits(DeFrameTransform, Transform);

function DeFrameTransform(options) {
    Transform.call(this, options);
    //console.log("ANTMESSAGE", ANTMessage);
    //initStream.bind(this)();
    //this.message = new ANTMessage();

}

// CB from node.js stream API
DeFrameTransform.prototype._transform = function _transform(payload, encoding, callback) {
   // console.log("Deframing ", payload);
    var overflow;
    overflow = !this.push(payload); // ECHO into readable stream for more piping
    if (overflow)
        console.log("DeFrameTransform: Stream indicate overflow, pushing data beyond highWaterMark");
    callback();
}


module.exports = DeFrameTransform;