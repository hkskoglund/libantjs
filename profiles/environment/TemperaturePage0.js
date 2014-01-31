/* global define: true, DataView: true */

define(function (require, exports, module) {
    'use strict';
    
    var GenericPage = require('profiles/Page');
    
    // Data page 0 - General Information
    // "Provides general information about the device's capabilities", spec. p. 15
    
    function Page(configuration,broadcast)
    {
          
                
        GenericPage.call(this,configuration,broadcast);
        
        this.type = GenericPage.prototype.TYPE.MAIN;

        this.transmissionInfo = {
            localTime : undefined,
            UTCTime: undefined,
            defaultTransmissionRate: undefined
        };

        this.supportedPages = {
            value: undefined
        };

        //this.profile = broadcast.profile;
        
       if (broadcast && broadcast.data)
           this.parse(broadcast);
    }
    
    Page.prototype = Object.create(GenericPage.prototype); 
    Page.prototype.constructor = Page; 
    
    // Bit field layout
    Page.prototype.BIT_FIELD = {
        
        TRANSMISSION_INFO : {
            LOCAL_TIME : { START_BIT : 4, LENGTH : 2 },
            UTC_TIME: { START_BIT : 2, LENGTH : 2 },
            DEFAULT_TRANSMISSION_RATE : { START_BIT : 0, LENGTH : 2}
        }
        
    };
    
    // Bit mask to pinpoint BIT_FIELD
    
    Page.prototype.BIT_MASK = {
        
        TRANSMISSION_INFO : {
            LOCAL_TIME : parseInt('00110000',2),
            UTC_TIME: parseInt('00001100',2),
            DEFAULT_TRANSMISSION_RATE : parseInt('00000011',2)
        }
        
    };
    
    // Byte layout
    Page.prototype.BYTE = {
        PAGE_NUMBER : 0,
        // Reserved
        // Reserved
        TRANSMISSION_INFO : 3,
        SUPPORTED_PAGES : 4
    };
            
    Page.prototype.TRANSMISSION_INFO = {
        
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
        
   
    Page.prototype.parse = function (broadcast)
    {
          var  data = broadcast.data, dataView = new DataView(data.buffer);
          var supportedPages;

          this.broadcast = broadcast;
        
        // Byte 0 - page number
        
        this.number = data[Page.prototype.BYTE.PAGE_NUMBER];

        // Byte 1 - Reserved
        // 0xFF
        
        // Byte 2 - Reserved
        // 0xFF
        
        // Byte 3 - Transmission info
        
        this.transmissionInfo.localTime = (data[Page.prototype.BYTE.TRANSMISSION_INFO] & Page.prototype.BIT_MASK.LOCAL_TIME) >> Page.prototype.BIT_FIELD.TRANSMISSION_INFO.LOCAL_TIME.START_BIT;
        this.transmissionInfo.UTCTime = (data[Page.prototype.BYTE.TRANSMISSION_INFO] & Page.prototype.BIT_MASK.UTC_TIME) >> Page.prototype.BIT_FIELD.TRANSMISSION_INFO.UTC_TIME.START_BIT;
        this.transmissionInfo.defaultTransmissionRate = data[Page.prototype.BYTE.TRANSMISSION_INFO] & Page.prototype.BIT_MASK.DEFAULT_TRANSMISSION_RATE;
      
        
        // Byte 4 - 7  - Supported pages
        
        supportedPages = dataView.getUint32(data.byteOffset+Page.prototype.BYTE.SUPPORTED_PAGES,true);
        this.supportedPages.value = supportedPages;
     
        for (var bitNr = 0; bitNr < 32; bitNr++)
            if (supportedPages & (1 << bitNr))
                this.supportedPages['page' + bitNr] = true;
      
    };
    
   Page.prototype.toString = function ()
   {
        var msg = this.type + " P# " + this.number + " Local time "+Page.prototype.TRANSMISSION_INFO.LOCAL_TIME[this.transmissionInfo.localTime] +
            " UTC time "+Page.prototype.TRANSMISSION_INFO.UTC_TIME[this.transmissionInfo.UTCTime]+
            " Tch "+Page.prototype.TRANSMISSION_INFO.DEFAULT_TRANSMISSION_RATE[this.transmissionInfo.defaultTransmissionRate]+
            " Pages 0b"+this.supportedPages.value.toString(2);
       
        return msg;
   };
    
    module.exports = Page;
    
    return module.exports;
    
    
    
});