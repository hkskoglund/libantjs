/* global define: true, DataView: true */

define(function (require, exports, module) {
    'use strict';
    var GenericPage = require('profiles/Page');

    function Page(configuration, broadcast) {
        GenericPage.call(this, configuration);

        this.type = GenericPage.prototype.TYPE.MAIN;

        if (broadcast.data)
            this.parse(broadcast);
    }

    Page.prototype = Object.create(GenericPage.prototype);
    Page.prototype.constructor = Page;

    // ANT+ Message byte layout
    Page.prototype.BYTE = {
        BIKE_CADENCE_EVENT_TIME: 0,
        CUMULATIVE_CADENCE_REVOLUTION_COUNT: 2,
        BIKE_SPEED_EVENT_TIME: 4,
        CUMULATIVE_SPEED_REVOLUTION_COUNT: 6
    };

    Page.prototype.parse = function (broadcast) {
        var data = broadcast.data,
            dataView = new DataView(data.buffer);

        this.broadcast = broadcast;

        this.number = 0;

        // Byte 0-1 - Bike Cadence Event Time LSB MSB - last valid bike cadence event - unit: 1/1024s - rollover : 64 s

        this.bikeCadenceEventTime = dataView.getUint16(data.byteOffset + Page.prototype.BYTE.BIKE_CADENCE_EVENT_TIME, true);

        // Byte 2-3 - Cumulative Cadence Revolution Cound LSB MSB - total number of pedal revolutions - rollover : 65536

        this.cumulativeCadenceRevolutionCount = dataView.getUint16(data.byteOffset + Page.prototype.BYTE.CUMULATIVE_CADENCE_REVOLUTION_COUNT, true);
        
        // Byte 4-5 - Bike speed event time LSB MSB - time of last valid bike speed event - unit : 1/1024 s, 64 s

        this.bikeSpeedEventTime = dataView.getUint16(data.byteOffset + Page.prototype.BYTE.BIKE_SPEED_EVENT_TIME, true);

        // Byte 6-7 - Cumulative Speed Revolution LSB MSB - total number of wheel revolutions - rollover : 65536

        this.cumulativeSpeedRevolutionCount = dataView.getUint16(data.byteOffset + Page.prototype.BYTE.CUMULATIVE_SPEED_REVOLUTION_COUNT, true);

        // Cadence


    };

   
    Page.prototype.toString = function () {
        var msg = this.type + " P# " + this.number + " cadence event time " + this.bikeCadenceEventTime + ' rev. # ' + this.cumulativeCadenceRevolutionCount +
            ' speed event time ' + this.bikeSpeedEventTime + ' rev. # ' + this.cumulativeSpeedRevolutionCount;

        return msg;
    };

    module.exports = Page;

    return module.exports;

});