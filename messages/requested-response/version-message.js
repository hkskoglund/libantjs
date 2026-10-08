'use strict';

  var Message = require('../message');

  function VersionMessage(data) {

    Message.call(this, data);

  }

  VersionMessage.prototype = Object.create(Message.prototype);

  VersionMessage.prototype.constructor = VersionMessage;

  VersionMessage.prototype.decode = function(data) {
    var version = this.content,
      versionStr = '';

    for (var i = 0; i < version.length && version[i] !== 0; i++)
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
  
