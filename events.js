/* global define: true */

// Simplification of https://github.com/joyent/node/blob/828f14556e0daeae7fdac08fceaa90952de63f73/lib/events.js

if (typeof define !== 'function'){ var define = require('amdefine')(module); }

define(function _requireDefineEventEmitter(require,exports,module){

    'use strict';

    // Using typeof, otherwise ReferenceError on process on the web

    if (typeof process !== 'undefined' && process.title === 'node') // Use native library on node platform
    {
      EventEmitter = require('events').EventEmitter;

      module.export = EventEmitter;

      return module.export;

    }

    function EventEmitter(configuration){

        this._events = {};
    }

    EventEmitter.prototype.addListener = function (type, listener){

        isFunction(listener);

        if (!this._events[type])
            this._events[type] = [];

        this._events[type].push(listener);

        return this;
    };

    EventEmitter.prototype.removeListener = function (type, listener){

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

    EventEmitter.prototype.removeAllListeners = function (type){

        var listeners = this._events[type];

        if (!listeners)
            return this;

        delete this._events[type];

        return this;
    };

    EventEmitter.prototype.emit = function (type){

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

        for (index = 0, len = listeners.length; index < len; index++){
            listeners[index].apply(this, args);

        }

        return true;

    };

    EventEmitter.prototype.once = function (type, listener)
    {

        var fired = false,

           runOnce = function _runOnce()
                      {
                        this.removeListener(type, g);

                        if (!fired)
                        {
                          fired = true;
                          listener.apply(this, arguments);
                        }
                      }.bind(this);

        this.on(type, runOnce);

        return this;
    };

    function isFunction(listener){

        if (typeof listener !== 'function')
            throw new TypeError('The provided listener is not a function');
    }

    module.export = EventEmitter;

    return module.export;

}
);
