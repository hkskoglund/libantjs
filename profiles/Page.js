/* global define: true, DataView: true, Uint8Array */

//if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {
    'use strict';
    
     function Page() {
          
     }
    
    Page.prototype.COMMON_PAGES = [0x50,0x51];
    
     Page.prototype.isCommon = function (number)
     {
         if (Page.prototype.COMMON_PAGES.indexOf(number) !== -1)
             return true;
         else
             return false;
     };
    
     Page.prototype.parseCommon = function (data,dataView)
     {
          
         this.number = data[0];
         
         switch (this.number)
         {
            
             case 0x50: // 80 Common data page - Manufactorer's identification 
                

                this.type = "Background";
                this.HWRevision = data[3];
                this.manufacturerID = dataView.getUint16(data.byteOffset+4,true);
                this.modelNumber = dataView.getUint16LE(data.byteOffset+6,true);

//                console.log(Date.now() + " " + page.pageType + " " + page.dataPageNumber + " HW revision: " + page.HWRevision + " Manufacturer ID: " + page.manufacturerID + " Model : " + page.modelNumber);

                break;
                 
                 case 0x51: // 81 Common data page - Product information 
                
                this.type = "Background";
                this.SWRevision = data[3];
                this.serialNumber = dataView.getUint32LE(data.byteOffset+4,true);

//                if (page.serialNumber === 0xFFFFFFFF)
//                    console.log(Date.now() + " "  +page.pageType + " " + page.dataPageNumber + " SW revision : " + page.SWRevision + " No serial number");
//                else
//                    console.log(Date.now() + " " + page.pageType + " " + page.dataPageNumber + " SW revision : " + page.SWRevision + " Serial number: " + page.serialNumber);

                break;
         }
             
     };
    
    Page.prototype.TYPE = {
        MAIN : "Main",
        BACKGROUND : "Background"
    };
    
    module.exports = Page;
    
    return module.exports;
});
