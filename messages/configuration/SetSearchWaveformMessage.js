/* global define: true, Uint8Array: true */

if (typeof define !== 'function')

define(function (require, exports, module)

    'use strict';

    var Message = require('../Message');

    function SetSearchWaveform(channel, searchWaveform)

        Message.call(this,undefined,Message.prototype.SET_SEARCH_WAVEFORM);

        this.encode(channel, searchWaveform);

    }

    SetSearchWaveform.prototype = Object.create(Message.prototype);

    SetSearchWaveform.prototype.constructor = SetSearchWaveform;

    SetSearchWaveform.prototype.STANDARD_SEARCH_WAVEFORM = 316;
    SetSearchWaveform.prototype.FAST_SEARCH_WAVEFORM = 97;

    SetSearchWaveform.prototype.encode = function (channel, searchWaveform)
    {
      var msgBuffer = new Uint8Array(2);

      msgBuffer[0] = channel;
      msgBuffer[1] = searchWaveform;

      this.channel = channel;
      this.searchWaveform = searchWaveform;

      this.setContent(msgBuffer.buffer);

    };

    SetSearchWaveform.prototype.toString = function ()
        return Message.prototype.toString.call(this) + ' C# ' + this.channel + ' search waveform ' + this.searchWaveform;
    };

    module.exports = SetSearchWaveform;
    return module.exports;
});