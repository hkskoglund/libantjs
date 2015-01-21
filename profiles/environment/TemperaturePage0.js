/* global define: true, DataView: true */

define(['profiles/mainPage'],function (MainPage) {
    
    'use strict';
    
    // Data page 0 - General Information
    // "Provides general information about the device's capabilities", spec. p. 15
    
    function TemperaturePage0(configuration,broadcast,profile,pageNumber)
    {
          
        MainPage.call(this,configuration,broadcast,profile,pageNumber);

    }
    
    TemperaturePage0.prototype = Object.create(MainPage.prototype);
    TemperaturePage0.prototype.constructor = TemperaturePage0; 
    
    // Bit field layout
    TemperaturePage0.prototype.BIT_FIELD = {
        
        TRANSMISSION_INFO : {
            LOCAL_TIME : { START_BIT : 4, LENGTH : 2 },
            UTC_TIME: { START_BIT : 2, LENGTH : 2 },
            DEFAULT_TRANSMISSION_RATE : { START_BIT : 0, LENGTH : 2}
        }
        
    };
    
    // Bit mask to pinpoint BIT_FIELD
    
    TemperaturePage0.prototype.BIT_MASK = {
        
        TRANSMISSION_INFO : {
            LOCAL_TIME : parseInt('00110000',2),
            UTC_TIME: parseInt('00001100',2),
            DEFAULT_TRANSMISSION_RATE : parseInt('00000011',2)
        }
        
    };
    
    // Byte layout
    TemperaturePage0.prototype.BYTE = {
        PAGE_NUMBER : 0,
        // Reserved
        // Reserved
        TRANSMISSION_INFO : 3,
        SUPPORTED_PAGES : 4
    };
            
    TemperaturePage0.prototype.TRANSMISSION_INFO = {
        
        LOCAL_TIME : {
            0 : "Not supported",
            1 : "Supported, not set",
            2 : "Supported and set",
            3 : "Reserved" 
        },
        
        UTC_TIME : {
            0 : "Not supported",
            1 : "Supported, Not Set",
            2 : "Supported and Set",
            3 : "Reserved" 
        },
   
        DEFAULT_TRANSMISSION_RATE : {
            0 : "0.5 Hz",
            1 : "4 Hz",
            2 : "Reserved",
            3 : "Reserved" 
        }
    };
        
    TemperaturePage0.prototype.readCommonBytes = function (broadcast)
    {
          var  data = broadcast.data,
               dataView = new DataView(data.buffer),
               supportedPages;
        
        // Byte 3 - Transmission info
        
         this.transmissionInfo = {
            localTime : undefined,
            UTCTime: undefined,
            defaultTransmissionRate: undefined
        };

        this.transmissionInfo.localTime = (data[TemperaturePage0.prototype.BYTE.TRANSMISSION_INFO] & TemperaturePage0.prototype.BIT_MASK.LOCAL_TIME) >> TemperaturePage0.prototype.BIT_FIELD.TRANSMISSION_INFO.LOCAL_TIME.START_BIT;
        this.transmissionInfo.UTCTime = (data[TemperaturePage0.prototype.BYTE.TRANSMISSION_INFO] & TemperaturePage0.prototype.BIT_MASK.UTC_TIME) >> TemperaturePage0.prototype.BIT_FIELD.TRANSMISSION_INFO.UTC_TIME.START_BIT;
        this.transmissionInfo.defaultTransmissionRate = data[TemperaturePage0.prototype.BYTE.TRANSMISSION_INFO] & TemperaturePage0.prototype.BIT_MASK.DEFAULT_TRANSMISSION_RATE;
      
        
        // Byte 4 - 7  - Supported pages
        
          this.supportedPages = {
            value: undefined
        };

        supportedPages = dataView.getUint32(data.byteOffset+TemperaturePage0.prototype.BYTE.SUPPORTED_PAGES,true);
        this.supportedPages.value = supportedPages;
     
        for (var bitNr = 0; bitNr < 32; bitNr++) {
            if (supportedPages & (1 << bitNr)) {
                this.supportedPages['page' + bitNr] = true;
            }
        }
      
    };
    
   TemperaturePage0.prototype.toString = function ()
   {
        var msg = "P# " + this.number + " Local time "+TemperaturePage0.prototype.TRANSMISSION_INFO.LOCAL_TIME[this.transmissionInfo.localTime] +
            " UTC time "+TemperaturePage0.prototype.TRANSMISSION_INFO.UTC_TIME[this.transmissionInfo.UTCTime]+
            " Tch "+TemperaturePage0.prototype.TRANSMISSION_INFO.DEFAULT_TRANSMISSION_RATE[this.transmissionInfo.defaultTransmissionRate]+
            " Pages 0b"+this.supportedPages.value.toString(2);
       
        return msg;
   };

    return TemperaturePage0;
    
});
