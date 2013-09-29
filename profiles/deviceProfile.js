

if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {
   "use strict";
    
    var Channel = require('channel');
     
    
    function DeviceProfile(configuration) {
        Channel.call(this);
        this._configuration = configuration;
       
    }
        
    DeviceProfile.prototype = Object.create(Channel.prototype);
    
    DeviceProfile.prototype.constructor = DeviceProfile;
    
    module.exports = DeviceProfile;
    
    return module.exports;
});

