/* global define: true */

define(['profiles/Page'],function _requireDefineGenericPage(GenericPage) {

    'use strict';

    function BackgroundPage(configuration, broadcast,profile,pageNumber) {

         GenericPage.call(this,configuration, broadcast,profile,pageNumber);

    }

    BackgroundPage.prototype = Object.create(GenericPage.prototype);
    BackgroundPage.prototype.constructor = BackgroundPage;

    BackgroundPage.prototype.COMMON.PAGE0x50 = 0x50;
    BackgroundPage.prototype.COMMON.PAGE0x51 = 0x51;
    BackgroundPage.prototype.COMMON.PAGE0x52 = 0x52;

    return BackgroundPage;

});
