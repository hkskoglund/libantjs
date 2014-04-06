/* global define: true */

// Simplification of https://github.com/joyent/node/blob/828f14556e0daeae7fdac08fceaa90952de63f73/lib/events.js

define(function _requireDefineEventEmitter() {

    'use strict';

    function EventEmitter(configuration) {



        this._events = {};
    }

    EventEmitter.prototype.addEventListener = function (type, listener) {

        checkListener(listener);

        if (!this._events[type])
            this._events[type] = [];

        this._events[type].push(listener);

        return this;
    };

    EventEmitter.prototype.removeEventListener = function (type, listener) {

        var listeners,
            index;

        checkListener(listener);

        listeners = this._events[type];

        if (!listeners)
            return this;

        index = listeners.indexOf(listener);

        if (index !== -1)
            listeners.splice(index, 1);

        return this;

    };

    EventEmitter.prototype.removeAllEventListeners = function (type) {

        var listeners = this._events[type];

        if (!listeners)
            return this;

        delete this._events[type];

        return this;
    };

    EventEmitter.prototype.emit = function (type) {

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

    function checkListener(listener) {

        if (typeof listener !== 'function')
            throw new TypeError('The provided listener is not a function');
    }

    return EventEmitter;
}
);
