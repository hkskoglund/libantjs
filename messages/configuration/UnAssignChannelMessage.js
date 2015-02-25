/* global define: true, Uint8Array: true */

if (typeof define !== 'function')

define(function (require, exports, module)
    'use strict';

    var Message = require('../Message');

    function UnAssignChannelMessage(channel)
    {

        Message.call(this,undefined,Message.prototype.UNASSIGN_CHANNEL);
        this.encode(channel);

    }

    UnAssignChannelMessage.prototype = Object.create(Message.prototype);

    UnAssignChannelMessage.prototype.constructor = UnAssignChannelMessage;

    UnAssignChannelMessage.prototype.encode = function (channel)
     {
      var msgBuffer = new Uint8Array([channel]);

      this.channel = channel;

      this.setContent(msgBuffer.buffer);

    };

    UnAssignChannelMessage.prototype.toString = function ()
        return Message.prototype.toString.call(this) + " C# " + this.channel;
    };

    module.exports = UnAssignChannelMessage;
        return module.exports;
});