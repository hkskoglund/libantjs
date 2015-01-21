/* global define: true */

define(['profiles/deviceProfile','profiles/hrm/HRMPage4','profiles/hrm/HRMPage0','profiles/Page','profiles/hrm/HRMPage'],function (DeviceProfile,HRMPage4,HRMPage0,GenericPage,HRMPage) {
    
  'use strict';

    function DeviceProfile_HRM(configuration) {
        
        DeviceProfile.call(this, configuration);
        
        this.initMasterSlaveConfiguration();
  
        // "Objects are always considered having different class if they don't have exactly the same set of properties in the same order."
        // http://codereview.stackexchange.com/questions/28344/should-i-put-default-values-of-attributes-on-the-prototype-to-save-space/28360#28360
        // "fields that are added to an object outside constructor or object literal, will not be stored directly on the object but in an array external to the object."
        // http://stackoverflow.com/questions/17925726/clearing-up-the-hidden-classes-concept-of-v8
        // http://thibaultlaurens.github.io/javascript/2013/04/29/how-the-v8-engine-works/

        // Purpose : More performance - does not need to generate a new HRM page Object for each broadcast
        // Profiling of new HRMPage4 -> does not take long to execute -> keep new HRMPage ...
        //this.hrmPage4 = new HRMPage4({log : true});

        this.requestPageUpdate(DeviceProfile_HRM.prototype.DEFAULT_PAGE_UPDATE_DELAY, this.processAggregatedRR);

        this.aggregatedRR = [];

    }
    
    DeviceProfile_HRM.prototype = Object.create(DeviceProfile.prototype); 
    DeviceProfile_HRM.prototype.constructor = DeviceProfile_HRM; 

    DeviceProfile_HRM.prototype.DEFAULT_PAGE_UPDATE_DELAY = 1000;
    
    // Ca. 4 messages pr. second, or 1 msg. pr 246.3 ms -> max HR supported 246.3 pr/minute
    DeviceProfile_HRM.prototype.CHANNEL_PERIOD = {
        DEFAULT : 8070,

    };

    DeviceProfile_HRM.prototype.NAME = 'HRM';
    
    DeviceProfile_HRM.prototype.CHANNEL_ID = {
        DEVICE_TYPE: 0x78,
        TRANSMISSION_TYPE : 0x01
    };

    // HRM sends out pages in page 4 * 64, background page 1 (for 1 second), page 4 *64, background page 2 (1 s.), page 4*64, background page 3 (1 s),....
    // When no HR data is sent from HR sensor, only background pages are sent each channel period; b1*64,b2*64,b3*64,b1*64,..... in accordance with the
    // normal behaviour of a broadcast master -> just repeat last broadcast if no new data available, then go to sleep if no HR data received in {timeout} millisec.
    // It seems like the {timeout} of HRM sensor "GARMIN HRM2-SS" is 2 minutes.

    DeviceProfile_HRM.prototype.INVALID_HEART_RATE = 0x00;
    
    DeviceProfile_HRM.prototype.PAGE_TOGGLE_CAPABLE = true;

    // Attach RR interval data to the latestPage
    DeviceProfile_HRM.prototype.processAggregatedRR = function(latestPage)
    {
      if (this.aggregatedRR && this.aggregatedRR.length)
      {
        latestPage.aggregatedRR = this.aggregatedRR;
        this.aggregatedRR = [];
      }
    };

    
    DeviceProfile_HRM.prototype.getPage = function (broadcast)
    {
         var page,
             pageNumber = this.getPageNumber(broadcast);

          switch (pageNumber) {
             
            // MAIN

            case 4 : 

                 page = new HRMPage4({ logger: this.log}, broadcast,this,pageNumber);

                 break;

            // Legacy

            case 0 :
                
                  page = new HRMPage0({ logger: this.log}, broadcast,this,pageNumber);
                
                  break;

            // BACKGROUND
            
            default:

                     page= this.getBackgroundPage(broadcast,pageNumber);

                     if (page)
                     {
                       HRMPage.prototype.readHR.call(page);
                       HRMPage.prototype.calcRRInterval.call(page);
                     }

                 break;

          }

        return page;

    };

    DeviceProfile_HRM.prototype.getPageNumber = function (broadcast)
    {
     var
            data = broadcast.data,
            pageNumber;

         // Byte 0 - Page number

       if (this.isPageToggle(broadcast)) {

        pageNumber = data[0] & GenericPage.prototype.BIT_MASK.PAGE_NUMBER; // (7 lsb)

       } else {

         pageNumber = 0;  // Legacy
       }

        return pageNumber;
    };

    DeviceProfile_HRM.prototype.addPage = function (page) {

      DeviceProfile.prototype.addPage.call(this,page);

      if (page.RRInterval) {
        this.aggregatedRR.push(page.RRInterval);
      }
    };

    return DeviceProfile_HRM;

});
