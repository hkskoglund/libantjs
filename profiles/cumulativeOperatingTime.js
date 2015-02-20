/* global define: true */

if (typeof define !== 'function'){ var define = require('amdefine')(module); }

define(function (require,exports,module){

    'use strict';

    var CumulativeOperatingTimeShared = require('./cumulativeOperatingTimeShared');

    function CumulativeOperatingTime(configuration,broadcast,profile,pageNumber)
    {
        CumulativeOperatingTimeShared.call(this,configuration,broadcast,profile,pageNumber);

        this.readCumulativeOperatingTime(broadcast,1);

    }

    CumulativeOperatingTime.prototype = Object.create(CumulativeOperatingTimeShared.prototype);
    CumulativeOperatingTime.prototype.constructor = CumulativeOperatingTime;

    CumulativeOperatingTime.prototype.toString = function (){

          var msg = "P# " + this.number +" Cumulative operating time  " + this.cumulativeOperatingTimeString;

        return msg;
    };

    module.exports = CumulativeOperatingTime;
    return module.exports;

});
