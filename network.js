var fs = require('fs');

function Network(nr, key) {
    var self = this
    this.number = nr;
    this.key = key;

//        console.log("Network key : ", this.key, " on network",this.number);
}

Network.prototype = {
    ANT: 0,      // Separate networks due to different keys
    ANT_FS: 1,
};

module.exports = Network;
