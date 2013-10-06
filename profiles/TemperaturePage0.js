/* global define: true, DataView: true */

define(function (require, exports, module) {
    'use strict';
    
    var GenericPage = require('profiles/Page');
    
    // Data page 0 - General Information
    // "Provides general information about the device's capabilities", spec. p. 15
    
    function Page(data,dataView)
    {
        GenericPage.call(this);
        
       if (data)
           this.parse(data,dataView);
    }
    
    Page.prototype = Object.create(GenericPage.prototype); 
    Page.prototype.constructor = Page; 
    
    // Bit field layout
    Page.prototype.BIT_FIELD = {
        
        TRANSMISSION_INFO : {
            LOCAL_TIME : { START_BIT : 4, LENGTH : 2 },
            UTC_TIME: { START_BIT : 2, LENGTH : 2 },
            DEFAULT_TRANSMISSION_RATE : { START_BIT : 0, LENGTH : 2}
        },
        
        SUPPORTED_PAGES : {
            PAGE1 : { START_BIT : 1, LENGTH : 1},
            PAGE0 : { START_BIT : 0, LENGTH : 1}
        }
    };
    
    // Bit mask to pinpoint BIT_FIELD
    
    Page.prototype.BIT_MASK = {
        
        TRANSMISSION_INFO : {
            LOCAL_TIME : parseInt('00110000',2),
            UTC_TIME: parseInt('00001100',2),
            DEFAULT_TRANSMISSION_RATE : parseInt('00000011',2)
        },
        
        SUPPORTED_PAGES : {
          //  SUPPORTED_PAGES : 3, // 0b11
            PAGE0 : 1, // 0b1
            PAGE1 : 1 << 1  // 0b10
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
            0 : "Local Time not supported",
            1 : "Local Time Supported, not set",
            2 : "Local Time Supported and set",
            3 : "Reserved" 
        },
        
        UTC_TIME : {
            0 : "System Time not supported",
            1 : "UTC Time Supported, Not Set",
            2 : "UTC Time Supported and Set",
            3 : "Reserved" 
        },
   
        DEFAULT_TRANSMISSION_RATE : {
            0 : "Default transmission rate of 0.5 Hz",
            1 : "Default transmission rate of 4 Hz",
            2 : "Reserved",
            3 : "Reserved" 
        }
    };
        
   
    Page.prototype.parse = function (data,dataView)
    {
         var supportedPages;
       
        this.type = GenericPage.prototype.TYPE.MAIN;
        
        // Byte 0 - page number
        
        this.number = data[Page.prototype.BYTE.PAGE_NUMBER];

        // Byte 1 - Reserved
        
        // Byte 2 - Reserved
        
        // Byte 3 - Transmission info
        
        this.transmissionInfo =  {
                    localTime : (data[Page.prototype.BYTE.TRANSMISSION_INFO] & Page.prototype.BIT_MASK.LOCAL_TIME) >> Page.prototype.BIT_FIELD.TRANSMISSION_INFO.LOCAL_TIME.START_BIT,
                    UTCTime : (data[Page.prototype.BYTE.TRANSMISSION_INFO] & Page.prototype.BIT_MASK.UTC_TIME) >> Page.prototype.BIT_FIELD.TRANSMISSION_INFO.UTC_TIME.START_BIT,
                    defaultTransmissionRate : data[Page.prototype.BYTE.TRANSMISSION_INFO] & Page.prototype.BIT_MASK.DEFAULT_TRANSMISSION_RATE
                };
        
        // Byte 4 - 7  - Supported pages
        
        supportedPages = dataView.getUint32(data.byteOffset+Page.prototype.BYTE.SUPPORTED_PAGES,true);
        this.supportedPages = {
               page0 : supportedPages & Page.prototype.BIT_MASK.SUPPORTED_PAGES.PAGE0,
               page1 : (supportedPages & Page.prototype.BIT_MASK.SUPPORTED_PAGES.PAGE1) >> Page.prototype.BIT_FIELD.SUPPORTED_PAGES.PAGE1.START_BIT
        };
    };
    
   Page.prototype.toString = function ()
   {
        var msg = this.type + " P# " + this.number + "Local time "+Page.prototype.TRANSMISSION_INFO.LOCAL_TIME[this.transmissionInfo.localTime] +
            " UTC time "+Page.prototype.TRANSMISSION_INFO.UTC_TIME[this.transmissionInfo.UTCTime]+
            " Default transmission rate "+Page.prototype.TRANSMISSION_INFO.DEFAULT_TRANSMISSION_RATE[this.transmissionInfo.defaultTransmissionRate]+
            " Supported pages "+this.supportedPages.toString(2);
       
        return msg;
   };
    
    
    
});