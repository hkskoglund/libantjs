/* global define: true */

if (typeof define !== 'function'){ var define = require('amdefine')(module); }

define(function _requireDefineReceivedPages(require,exports,module){

    'use strict';

    var GenericPage = require('./Page');

    // Use named function to allow for tracing in profiler
    function ReceivedPages(sensorId){

       this.all = [];
        for (var type in GenericPage.prototype.TYPE)
            this[GenericPage.prototype.TYPE[type]] = {};
    }

    module.exports =  ReceivedPages;
    return module.exports;

});
