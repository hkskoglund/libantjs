/* global define: true */

if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require,exports,module) {

    'use strict';

    var HRMPage = require('./HRMPage');

    function HRMPage0(configuration, broadcast, profile,pageNumber) {

       HRMPage.call(this,configuration, broadcast, profile,pageNumber);

    }

    HRMPage0.prototype = Object.create(HRMPage.prototype);
    HRMPage0.prototype.constructor = HRMPage0;

    HRMPage0.prototype.readCommonBytes = function ()
    {

        this.readHR();

        // Old legacy format doesnt have previous heart beat event time
        // this.previousHeartBeatEventTime = undefined;

    };

    module.exports = HRMPage0;
    return module.exports;

});
