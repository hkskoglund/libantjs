/* global define: true */

if (typeof define !== 'function') { var define = require('amdefine')(module); }
define(function (require,exports,module){

  'use strict';

  function Network(number,key)
  {
      this.number = number;
      this.key = key;
  }

  Network.prototype.PUBLIC = 0x00;
  Network.prototype.KEY = {
    'ANT+' : [0xB9, 0xA5, 0x21, 0xFB,0xBD, 0x72,0xC3,0x45]
  };

  Network.prototype.toString = function ()
  {
    var msg = this.number.toString();
    if (this.key)
      msg += this.key.toString();

    return msg;
  }

  module.export = Network;
  return module.export;

});
