/* global define: true */

define(['profiles/mainPage'],function (MainPage) {
    
    'use strict';
    
    // Data page 1 - Temperature
    
    function TemperaturePage1(configuration,broadcast,profile,pageNumber)
    {
        MainPage.call(this,configuration,broadcast,profile,pageNumber);

    }
    
    TemperaturePage1.prototype = Object.create(MainPage.prototype);
    TemperaturePage1.prototype.constructor = TemperaturePage1; 
    
     // Byte layout
    TemperaturePage1.prototype.BYTE_OFFSET = {
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
    TemperaturePage1.prototype.BIT_FIELD = {
        
        HOUR24_LOW_MSN : { START_BIT : 4, LENGTH : 4 },
        SIGN_HOUR24_LOW_MSN : { START_BIT : 3, LENGTH : 1},
        
        HOUR24_HIGH_LSN : { START_BIT : 4, LENGTH : 4},
        SIGN_HOUR24_HIGH_MSB: { START_BIT : 7, LENGTH : 1},
             
        SIGN_CURRENT_TEMP : { START_BIT : 7, LENGTH : 1}
       
    };
    
    // Bit mask to pinpoint BIT_FIELD
    TemperaturePage1.prototype.BIT_MASK = {
        
        HOUR24_LOW_MSN : parseInt("11110000",2),
        HOUR24_HIGH_LSN : parseInt("00001111",2),
        
        SIGN_CURRENT_TEMP : parseInt("10000000",2),
        VALUE_CURRENT_TEMP_MSB : parseInt("01111111",2),
        
        SIGN_HOUR24_HIGH_MSB : parseInt("10000000",2),
        VALUE_HOUR24_HIGH_MSB : parseInt("01111111",2),
        
        VALUE_HOUR24_LOW_MSN : parseInt("0111",2),
        
        MAGNITUDE_LOW_HIGH : parseInt("011111111111",2),
        
        MAGNITUDE_CURRENT_TEMP : parseInt("0111111111111111",2)
        
    };

    TemperaturePage1.prototype.UNIT = {
        HOUR24_LOW : 0.1,
        HOUR24_HIGH : 0.1,
        CURRENT_TEMP : 0.01
    };

    TemperaturePage1.prototype.readCommonBytes = function (broadcast)
    {
        var data = broadcast.data;

        // Byte 0 - page number  Read in deviceprofile

        // Byte 1 - Reserved 0xFF

        // Byte 2 - Event count - increments with each measurement
        
        this.eventCount = data[TemperaturePage1.prototype.BYTE_OFFSET.EVENT_COUNT];
        
        // Byte 3 - 24 hour low LSB
        
        var hour24LowLSB = data[TemperaturePage1.prototype.BYTE_OFFSET.HOUR24_LOW_LSB];

        // Byte 4 - 24 hour low MSN (4:7) and 24 hour high LSN (0:3)

        // Signed Integer 1.5 byte
        // Sbbb bbbbbbbb
       // console.log("MSB",Number(data[4]).toString(2),"LSB",Number(data[3]).toString(2),data);
        var hour24LowMSN = (data[TemperaturePage1.prototype.BYTE_OFFSET.HOUR24_LOW_MSN] & TemperaturePage1.prototype.BIT_MASK.HOUR24_LOW_MSN) >> TemperaturePage1.prototype.BIT_FIELD.HOUR24_LOW_MSN.START_BIT;
        // Byte 4 & Sbbb 0000 >> 4
        
       var signHour24LowMSN = (hour24LowMSN >> TemperaturePage1.prototype.BIT_FIELD.SIGN_HOUR24_LOW_MSN.START_BIT)  === 1 ? -1 : 1;
        
        var valueHour24LowMSN = hour24LowMSN & TemperaturePage1.prototype.BIT_MASK.VALUE_HOUR24_LOW_MSN;
        // bbb
        
        // Javascript : bitwise operators working on 32-bit 2's complement bigendian 
        //https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_Operators
        
        // Negative numbers are inverted (1's complement)
        // 0.1 = 0x01 0x0
        // Inverted 0.1 = 0xFE 0xF
        // -0.1 ANT+ Sensor Simulator v1.9 0xFF 0xF ("highest negative number")
            
        var valueHour24Low = (valueHour24LowMSN << 8) | hour24LowLSB;
       
        
        if (valueHour24Low !== 0x800) // -0 INVALID
        {
             if (signHour24LowMSN === -1)
                    valueHour24Low = (-valueHour24Low) & TemperaturePage1.prototype.BIT_MASK.MAGNITUDE_LOW_HIGH; // Mask 11-bit magnitude of signed int for 1's complement form of negative integer
            this.hour24Low = valueHour24Low * signHour24LowMSN * TemperaturePage1.prototype.UNIT.HOUR24_LOW;
        }
        else
            this.hour24Low = undefined;
        
        var hour24HighLSN = (data[TemperaturePage1.prototype.BYTE_OFFSET.HOUR24_HIGH_LSN] & TemperaturePage1.prototype.BIT_MASK.HOUR24_HIGH_LSN);

        // Byte 4 & 0000 1111

        // Byte 5 - 24 hour high MSB
        
        var hour24HighMSB = data[TemperaturePage1.prototype.BYTE_OFFSET.HOUR24_HIGH_MSB];
        
        var signHour24HighMSB = ((hour24HighMSB & TemperaturePage1.prototype.BIT_MASK.SIGN_HOUR24_HIGH_MSB) >> TemperaturePage1.prototype.BIT_FIELD.SIGN_HOUR24_HIGH_MSB.START_BIT)  === 1 ?  -1 : 1;
        
        var value24HighMSB = hour24HighMSB & TemperaturePage1.prototype.BIT_MASK.VALUE_HOUR24_HIGH_MSB;

        // Byte 5 & 0b01111111
        
        var value24High = (value24HighMSB << 4) | hour24HighLSN;

        if (value24High !== 0x800) {
             if (signHour24HighMSB === -1) 
              value24High = (-value24High) & TemperaturePage1.prototype.BIT_MASK.MAGNITUDE_LOW_HIGH;
            
            this.hour24High = value24High * signHour24HighMSB * TemperaturePage1.prototype.UNIT.HOUR24_HIGH;
        }
        else
            this.hour24High = undefined;
        
        // Byte 6 -7

        var currentTempLSB = data[TemperaturePage1.prototype.BYTE_OFFSET.CURRENT_TEMP_LSB];

        // Byte 7

        var currentTempMSB = data[TemperaturePage1.prototype.BYTE_OFFSET.CURRENT_TEMP_MSB];
        
        var signCurrentTempMSB = ((currentTempMSB & TemperaturePage1.prototype.BIT_MASK.SIGN_CURRENT_TEMP) >> TemperaturePage1.prototype.BIT_FIELD.SIGN_CURRENT_TEMP.START_BIT)  === 1 ?  -1 : 1;
        
        var valueCurrentTempMSB = currentTempMSB & TemperaturePage1.prototype.BIT_MASK.VALUE_CURRENT_TEMP_MSB;
       
        var valueCurrentTemp = (valueCurrentTempMSB << 8) | currentTempLSB;

        if (valueCurrentTemp !== 0x8000)
        {
    
             if (signCurrentTempMSB == -1)
                valueCurrentTemp = (~valueCurrentTemp) & TemperaturePage1.prototype.BIT_MASK.MAGNITUDE_CURRENT_TEMP;  
        
           this.currentTemp = valueCurrentTemp * signCurrentTempMSB * TemperaturePage1.prototype.UNIT.CURRENT_TEMP;
        }
    
        else
            this.currentTemp = undefined;
    };
   
   TemperaturePage1.prototype.toString = function ()
   {
        var msg = "P# " + this.number + " Event count " + this.eventCount+ " Low (24H) " + this.hour24Low.toFixed(1)+ "°C High (24H) "+
            this.hour24High.toFixed(1)+ "°C Current Temp "+this.currentTemp.toFixed(2)+ "°C";
       
        return msg;
   };

    return TemperaturePage1;
    
});
