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
    Page.prototype.BYTE_OFFSET = {
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
        SIGN_HOUR24_LOW_MSN : { START_BIT : 3, LENGTH : 1},
        
        HOUR24_HIGH_LSN : { START_BIT : 4, LENGTH : 4},
        SIGN_HOUR24_HIGH_MSB: { START_BIT : 7, LENGTH : 1},
             
        SIGN_CURRENT_TEMP : { START_BIT : 7, LENGTH : 1}
       
    };
    
    // Bit mask to pinpoint BIT_FIELD
    
    Page.prototype.BIT_MASK = {
        
        HOUR24_LOW_MSN : parseInt("11110000",2),
        HOUR24_HIGH_LSN : parseInt("00001111",2),
        
        SIGN_CURRENT_TEMP : parseInt("10000000",2),
        VALUE_CURRENT_TEMP_MSB : parseInt("01111111",2),
        
        SIGN_HOUR24_HIGH_MSB : parseInt("10000000",2),
        VALUE_HOUR24_HIGH_MSB : parseInt("01111111",2),
        
        VALUE_HOUR24_LOW_MSN : parseInt("0111",2),
        
    
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
        
        this.number = data[Page.prototype.BYTE_OFFSET.PAGE_NUMBER];

        // Byte 1 - Reserved
        // 0xFF
        
        // Byte 2 - Event count - increments with each measurement
        
        this.eventCount = data[Page.prototype.BYTE_OFFSET.EVENT_COUNT];
        
        // Byte 3 - 24 hour low LSB
        
        var hour24LowLSB = data[Page.prototype.BYTE_OFFSET.HOUR24_LOW_LSB];
        
        //
        // Byte 4 - 24 hour low MSN (4:7) and 24 hour high LSN (0:3)
        //
        
        // Signed Integer 1.5 byte
        // Sbbb bbbbbbbb
       
        var hour24LowMSN = (data[Page.prototype.BYTE_OFFSET.HOUR24_LOW_MSN] & Page.prototype.BIT_MASK.HOUR24_LOW_MSN) >> Page.prototype.BIT_FIELD.HOUR24_LOW_MSN.START_BIT;
        // Byte 4 & Sbbb 0000 >> 4
        
       var signHour24LowMSN = (hour24LowMSN >> Page.prototype.BIT_FIELD.SIGN_HOUR24_LOW_MSN.START_BIT)  === 1 ? -1 : 1;
        
        var valueHour24LowMSN = hour24LowMSN & Page.prototype.BIT_MASK.VALUE_HOUR24_LOW_MSN;
        // bbb
        
        var valueHour24Low = (valueHour24LowMSN << 8) | hour24LowLSB;
        if (valueHour24Low !== 0x800) // -0
            this.hour24Low = valueHour24Low * signHour24LowMSN * Page.prototype.UNIT.HOUR24_LOW;
        else
            this.hour24Low = undefined;
        
        var hour24HighLSN = (data[Page.prototype.BYTE_OFFSET.HOUR24_HIGH_LSN] & Page.prototype.BIT_MASK.HOUR24_HIGH_LSN);
        // Byte 4 & 0000 1111
        
        //
        // Byte 5 - 24 hour high MSB
        //
        
        var hour24HighMSB = data[Page.prototype.BYTE_OFFSET.HOUR24_HIGH_MSB];
        
        var signHour24HighMSB = ((hour24HighMSB & Page.prototype.BIT_MASK.SIGN_HOUR24_HIGH_MSB) >> Page.prototype.BIT_FIELD.SIGN_HOUR24_HIGH_MSB.START_BIT)  === 1 ?  -1 : 1;
        
        var value24HighMSB = hour24HighMSB & Page.prototype.BIT_MASK.VALUE_HOUR24_HIGH_MSB;
        // Byte 5 & 0b01111111
        
        var value24High = (value24HighMSB << 4) | hour24HighLSN;
        if (value24High !== 0x800)
            this.hour24High = value24High * signHour24HighMSB * Page.prototype.UNIT.HOUR24_HIGH;
        else
            this.hour24High = undefined;
        //
        // Byte 6 -7
        //
        
        var currentTempLSB = data[Page.prototype.BYTE_OFFSET.CURRENT_TEMP_LSB];
        
        //
        // Byte 7
        //
        var currentTempMSB = data[Page.prototype.BYTE_OFFSET.CURRENT_TEMP_MSB];
        
        var signCurrentTempMSB = ((currentTempMSB & Page.prototype.BIT_MASK.SIGN_CURRENT_TEMP) >> Page.prototype.BIT_FIELD.SIGN_CURRENT_TEMP.START_BIT)  === 1 ?  -1 : 1;
        
        var valueCurrentTempMSB = currentTempMSB & Page.prototype.BIT_MASK.VALUE_CURRENT_TEMP_MSB;
       
        var valueCurrentTemp = (valueCurrentTempMSB << 8) | currentTempLSB;
        
        if (valueCurrentTemp !== 0x8000)
            
           this.currentTemp = valueCurrentTemp * signCurrentTempMSB * Page.prototype.UNIT.CURRENT_TEMP;
        else
            this.currentTemp = undefined;
    };
   
   Page.prototype.toString = function ()
   {
        var msg = this.type + " P# " + this.number + " Event count " + this.eventCount+ " low (24H) " + this.hour24Low.toFixed(1)+ "°C high (24H) "+
            this.hour24High.toFixed(1)+ "°C Current Temp "+this.currentTemp.toFixed(2)+ "°C";
       
        return msg;
   };
    
    module.exports = Page;
    
    return module.exports;
    
    
    
});