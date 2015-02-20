/* global define: true */

if (typeof define !== 'function'){ var define = require('amdefine')(module); }

define(function (require,exports,module){

    'use strict';

    var BackgroundPage = require('./backgroundPage');

    function ProductId(configuration,broadcast,profile,pageNumber)
    {
        BackgroundPage.call(this,configuration,broadcast,profile,pageNumber);

        this.read(broadcast);

    }

    ProductId.prototype = Object.create(BackgroundPage.prototype);
    ProductId.prototype.constructor = ProductId;

    // Background Page 3
    ProductId.prototype.read = function (broadcast)
    {
        var data = broadcast.data;

        this.hardwareVersion = data[1];
        this.softwareVersion = data[2];
        this.modelNumber = data[3];
    };

    ProductId.prototype.toString = function (){
        var msg =  " P# " + this.number +" HW ver. " + this.hardwareVersion + " SW ver. " + this.softwareVersion + " Model " + this.modelNumber;

        return msg;
    };


    module.exports = ProductId;
    return module.exports;

});
