/* global define: true */

define(['profiles/Page'],  function _requireDefineReceivedPages(GenericPage) {

    'use strict';

    // Use named function to allow for tracing in profiler
    function ReceivedPages(sensorId) {

       this.all = [];
        for (var type in GenericPage.prototype.TYPE)
            this[GenericPage.prototype.TYPE[type]] = {};
    }

    return ReceivedPages;

});
