'use strict';

var Message = require('../message');

class VersionMessage extends Message {
  constructor(data) {

    super(data);
  }

  decode(data) {

    var version = this.content,
      versionStr = '';

    for (var i = 0; i < version.length && version[i] !== 0; i++)
      versionStr += String.fromCharCode(version[i]);

    this.version = versionStr;
  }

  getVersion() {

    return this.version;
  }

  toString() {

    return Message.prototype.toString.call(this) + ' ' + this.version;
  }
}

module.exports = VersionMessage;

