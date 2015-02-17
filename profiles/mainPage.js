/* global define: true */

if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function _requireDefineGenericPage(require,exports,module) {

    'use strict';

    var GenericPage = require('./Page');

    function MainPage(configuration, broadcast,profile,pageNumber) {

        GenericPage.call(this,configuration, broadcast,profile,pageNumber);

    }

    MainPage.prototype = Object.create(GenericPage.prototype);
    MainPage.prototype.constructor = MainPage;

    module.exports = MainPage;
    return module.exports;

});
