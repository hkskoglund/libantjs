/* global define: true */

define(['logger'],function _requireDefineGenericPage(Logger) {

    'use strict';

    function GenericPage(configuration, broadcast,profile,pageNumber) {

        this.log = configuration.logger || new Logger(configuration);

        if (!broadcast || !broadcast.data) {
           return;
        }

        this.broadcast = broadcast;

        this.timestamp = broadcast.timestamp;

        if (this.timestamp === undefined)
          {
              this.timestamp = Date.now();
              if (this.log && this.log.logging) {
               this.log.log('warn','No timestamp on broadcast, setting it to now',this.timestamp);
              }
          }

        this.number = pageNumber; // page number already read by device profile

        if (this.number === undefined)
        {
             if (this.log && this.log.logging) {
               this.log.log('warn','Cannot accept undefined page number');
             }

            return;
          }

        this.profile = profile; // For e.g previous page

       // this.previousPage = this.profile.getPreviousPageValidateRolloverTime();

        // Background pages does not have these functions

        if (typeof this.readCommonBytes === 'function') {
           this.readCommonBytes(broadcast);
        }

         if (typeof this.update === 'function') {
            this.update(broadcast); // e.g bike speed and cadence calculations
         }
    }

    GenericPage.prototype.BIT_MASK = {
        PAGE_NUMBER : parseInt("01111111",2), // 7 lsb of byte 0 ANT+ format
        PAGE_TOGGLE : parseInt("10000000",2) // msb of byte 0 ANT+ format
    };

    GenericPage.prototype.COMMON = {};

    // Used for filtering message properties when using window.postMessage (some properties gives error 'DOMException - cannot clone')
    GenericPage.prototype.clone = function () {

        var clone = Object.create(null), // Pure object
            ownEnumerableProperties = Object.keys(this),
            property;

        for (var index in ownEnumerableProperties) {
            property = ownEnumerableProperties[index];

            switch (property) {

                case 'broadcast': // return the most essential information for the ui

                    clone.broadcast = {

                        channelId: this.broadcast.channelId,
                        timestamp : this.broadcast.timestamp

                    };

                    break;

                case 'log': // ignore
                case 'previousPage':
                case 'profile':

                    break;

                default:

                    clone[property] = this[property];

                    break;

            }

        }

        return clone;

    };

    return GenericPage;

});
