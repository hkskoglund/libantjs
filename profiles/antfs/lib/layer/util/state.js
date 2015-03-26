/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

if (typeof define !== 'function') {
  var define = require('amdefine')(module);
}

define(function(require, exports, module) {

  'use strict';

  function State(state) {
    this.state = state || State.prototype.LINK;
  }

  State.prototype.LINK = 0x00;
  State.prototype.AUTHENTICATION = 0x01;
  State.prototype.TRANSPORT = 0x02;
  State.prototype.BUSY = 0x03;

  State.prototype.get = function ()
  {
    return this.state;
  };

  State.prototype.setLink = function ()
  {
    this.set(State.prototype.LINK);
  };

  State.prototype.set = function (state)
  {
   var prevState = this.state;
   if (state !== prevState) {
    this.state = state;
    console.log('State transition ' + new State(prevState).toString() + ' to ' + this.toString());
   }
  };

  State.prototype.isLink = function ()
  {
    return this.state === State.prototype.LINK;
  };

  State.prototype.isAuthentication = function ()
  {
    return this.state === State.prototype.AUTHENTICATION;
  };

  State.prototype.isTransport = function ()
  {
    return this.state === State.prototype.TRANSPORT;
  };

  State.prototype.isBusy = function ()
  {
    return this.state === State.prototype.BUSY;
  };

  State.prototype.toString = function() {

     switch (this.state)
     {
       case State.prototype.LINK : return "LINK";
       case State.prototype.AUTHENTICATION : return "AUTHENTICATION";
       case State.prototype.TRANSPORT : return "TRANSPORT";
       case State.prototype.BUSY : return "BUSY";
     }
  };

  module.exports = State;
  return module.exports;
});
