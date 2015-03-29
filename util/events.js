/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */

  'use strict';

  // Using typeof, otherwise ReferenceError on process on the web

  if (typeof process !== 'undefined') // Use native library on node platform
  {
    EventEmitter = require('events').EventEmitter;

    module.export = EventEmitter;

    return module.export;

  }

  function EventEmitter(configuration) {

    this._events = {};
  }

  EventEmitter.prototype.addListener = function(type, listener) {

    isFunction(listener);

    if (!this._events[type])
      this._events[type] = [];

    this._events[type].push(listener);

    return this;
  };

  EventEmitter.prototype.removeListener = function(type, listener) {

    var listeners,
      index;

    isFunction(listener);

    listeners = this._events[type];

    if (!listeners)
      return this;

    index = listeners.indexOf(listener);

    if (index !== -1)
      listeners.splice(index, 1);

    return this;

  };

  EventEmitter.prototype.removeAllListeners = function(type) {

    var listeners = this._events[type];

    if (!listeners)
      return this;

    delete this._events[type];

    return this;
  };

  EventEmitter.prototype.emit = function(type) {

    var listeners = this._events[type],
      index,
      listener,
      args = [],
      argNr,
      len;

    if (!listeners)
      return false;

    // Setup arguments passed to listener
    for (argNr = 1, len = arguments.length; argNr < len; argNr++)
      args.push(arguments[argNr]);

    for (index = 0, len = listeners.length; index < len; index++) {
      listeners[index].apply(this, args);

    }

    return true;

  };

  EventEmitter.prototype.once = function(type, listener) {

    var fired = false,

      runOnce = function _runOnce() {
        this.removeListener(type, g);

        if (!fired) {
          fired = true;
          listener.apply(this, arguments);
        }
      }.bind(this);

    this.on(type, runOnce);

    return this;
  };

  EventEmitter.prototype.listeners = function listeners(type) {
    var ret;
    if (!this._events || !this._events[type])
      ret = [];
    else if (typeof this._events[type] === 'function')
      ret = [this._events[type]];
    else
      ret = this._events[type].slice();
    return ret;
  };

  function isFunction(listener) {

    if (typeof listener !== 'function')
      throw new TypeError('The provided listener is not a function');
  }

  module.export = EventEmitter;

  return module.export;
