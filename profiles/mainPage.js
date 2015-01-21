/* global define: true */

define(['profiles/Page'],function _requireDefineGenericPage(GenericPage) {

    'use strict';

    function MainPage(configuration, broadcast,profile,pageNumber) {

        GenericPage.call(this,configuration, broadcast,profile,pageNumber);

    }

    MainPage.prototype = Object.create(GenericPage.prototype);
    MainPage.prototype.constructor = MainPage;

    return MainPage;

});
