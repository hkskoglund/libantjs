/* global define: true */

define(['profiles/Page'], function (GenericPage) {

    'use strict';

    function ProductId(configuration,broadcast,profile,pageNumber)
    {
        GenericPage.call(this,configuration,broadcast,profile,pageNumber);

        this.type = this.TYPE.BACKGROUND;

        this.read(broadcast);

    }

    ProductId.prototype = Object.create(GenericPage.prototype);
    ProductId.prototype.constructor = ProductId;

    // Background Page 3
    ProductId.prototype.read = function (broadcast)
    {
        var data = broadcast.data;

        this.hardwareVersion = data[1];
        this.softwareVersion = data[2];
        this.modelNumber = data[3];
    };

    ProductId.prototype.toString = function () {
        var msg = this.type + " P# " + this.number +" HW ver. " + this.hardwareVersion + " SW ver. " + this.softwareVersion + " Model " + this.modelNumber;

        return msg;
    };


    return ProductId;

});
