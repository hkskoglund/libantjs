/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

  /*jshint -W097 */
'use strict';

  var Message = require('../Message');

  function VersionMessage(data) {

    Message.call(this, data);

  }

  VersionMessage.prototype = Object.create(Message.prototype);

  VersionMessage.prototype.constructor = VersionMessage;

  VersionMessage.prototype.decode = function(data) {
    var version = this.payload.subarray(0, -1),
      versionStr = String.fromCharCode(this.channel); // Content is a 11 - bytes null terminated string - strip off the null

    for (var i = 0; i < version.length; i++)
      versionStr += String.fromCharCode(version[i]);

    this.version = versionStr;

  };

  VersionMessage.prototype.getVersion = function() {
    return this.version;
  };

  VersionMessage.prototype.toString = function() {
    return Message.prototype.toString.call(this) + ' ' + this.version;
  };

  module.exports = VersionMessage;
  return module.exports;
