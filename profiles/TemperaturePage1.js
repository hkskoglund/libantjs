/* global define: true, DataView: true */

define(function (require, exports, module) {
    'use strict';
    
    var GenericPage = require('profiles/Page');
    
    // Data page 1 - Temperature
    
    function Page(configuration,data,dataView)
    {
        GenericPage.call(this,configuration);
        
         this.type = GenericPage.prototype.TYPE.MAIN;
        
       if (data)
           this.parse(data,dataView);
    }
    
    Page.prototype = Object.create(GenericPage.prototype); 
    Page.prototype.constructor = Page; 
    
     // Byte layout
    Page.prototype.BYTE = {
        PAGE_NUMBER : 0,
        // Reserved
        EVENT_COUNT : 2,
        HOUR24_LOW_LSB : 3,
        HOUR24_LOW_MSN : 4,
        HOUR24_HIGH_LSN : 4,
        HOUR24_HIGH_MSB : 5,
        CURRENT_TEMP_LSB : 6,
        CURRENT_TEMP_MSB : 7
    };
    
    // Bit field layout
    Page.prototype.BIT_FIELD = {
        
        HOUR24_LOW_MSN : { START_BIT : 4, LENGTH : 4 },
        HOUR24_HIGH_LSN : { START_BIT : 4, LENGTH : 4},
        SIGN_CURRENT_TEMP : { START_BIT : 7, LENGTH : 1},
        SIGN_HOUR24_HIGH_MSB: { START_BIT : 7, LENGTH : 1},
        SIGN_HOUR24_LOW_MSN : { START_BIT : 3, LENGTH : 1}
    };
    
    // Bit mask to pinpoint BIT_FIELD
    
    Page.prototype.BIT_MASK = {
        
        HOUR24_LOW_MSN : parseInt("11110000",2),
        HOUR24_HIGH_LSN : parseInt("00001111",2),
        
        SIGN_CURRENT_TEMP : parseInt("10000000",2),
        VALUE_CURRENT_TEMP_MSB : parseInt("01111111",2),
        
        SIGN_HOUR24_HIGH_MSB : parseInt("10000000",2),
        VALUE_HOUR24_HIGH_MSB : parseInt("01111111",2),
        
        VALUE_HOUR24_LOW_MSN : parseInt("0111",2)
    
    };
          
   
    Page.prototype.UNIT = {
        HOUR24_LOW : 0.1,
        HOUR24_HIGH : 0.1,
        CURRENT_TEMP : 0.01
    };
        
    Page.prototype.parse = function (data,dataView)
    {
         var supportedPages;
       
        // Byte 0 - page number
        
        this.number = data[Page.prototype.BYTE.PAGE_NUMBER];

        // Byte 1 - Reserved
        
        // Byte 2 - Event count - increments with each measurement
        
        this.eventCount = data[Page.prototype.BYTE.EVENT_COUNT];
        
        // Byte 3 - 24 hour low LSB
        
        var hour24LowLSB = data[Page.prototype.BYTE.HOUR24_LOW_LSB];
        
        // Byte 4 - 24 hour low MSN (4:7) and 24 hour high LSN (0:3)
       
        var hour24LowMSN = (data[Page.prototype.BYTE.HOUR24_LOW_MSN] & Page.prototype.BIT_MASK.HOUR24_LOW_MSN) >> Page.prototype.BIT_FIELD.HOUR24_HIGH_LSN.START_BIT;
       var signHour24LowMSN = (hour24LowMSN >> Page.prototype.BIT_FIELD.SIGN_HOUR24_LOW_MSN)*-1;
        var valueHour24LowMSN = hour24LowMSN & Page.prototype.BIT_MASK.VALUE_HOUR24_LOW_MSN;
        this.hour24Low = (valueHour24LowMSN*256+hour24LowLSB)*signHour24LowMSN*Page.prototype.UNIT.HOUR24_LOW;
        
        
        var hour24HighLSN = (data[Page.prototype.BYTE.HOUR24_HIGH_LSN] & Page.prototype.BIT_MASK.HOUR24_HIGH_LSN);
        
        // Byte 5 - 24 hour high MSB
        
        var hour24HighMSB = data[Page.prototype.BYTE.HOUR24_HIGH_MSB];
        var signHour24HighMSB = ((hour24HighMSB & Page.prototype.BIT_MASK.SIGN_HOUR24_HIGH_MSB) >> Page.prototype.BIT_FIELD.SIGN_HOUR24_HIGH_MSB.START_BIT)*-1;
        var value24HighMSB = hour24HighMSB & Page.prototype.BIT_MASK.VALUE_HOUR24_HIGH_MSB;
        
        this.hour24High = ((value24HighMSB << 4) & hour24HighLSN)*signHour24HighMSB*Page.prototpe.UNIT.HOUR24_HIGH;
        
        // Byte 6 
        
        var currentTempLSB = data[Page.prototype.BYTE.CURRENT_TEMP_LSB];
        
        // Byte 7
        
        var currentTempMSB = data[Page.prototype.BYTE.CURRENT_TEMP_MSB];
        var signCurrentTempMSB = ((currentTempMSB & Page.prototype.BIT_MASK.SIGN_CURRENT_TEMP) >> Page.prototype.BIT_FIELD.SIGN_CURRENT_TEMP.START_BIT)*-1;
        var valueCurrentTempMSB = currentTempMSB & Page.prototype.BIT_MASK.VALUE_CURRENT_TEMP_MSB;
        
        this.currentTemp = (valueCurrentTempMSB*256+currentTempLSB)*signCurrentTempMSB*Page.prototype.UNIT.CURRENT_TEMP;
    };
   
   Page.prototype.toString = function ()
   {
        var msg = this.type + " P# " + this.number + " Event count " + this.eventCount+ " 24H low" + this.hour24Low+ " 24H high "+
            this.hour24High+ "Temp "+this.currentTemp;
       
        return msg;
   };
    
    
    
});