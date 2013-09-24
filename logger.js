
// Allows using define in node.js
// Require.js : require({moduleId}) -> {moduleId} translated to a path (using baseUrl+path configuration)
if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {

    function Logger(log)
    {
        if (log)
           this._logging = true;
        else
            this._logging = false;
    }
        
    Logger.prototype.set = function (log)
    {
        this._logging = log;
    }
    
    Logger.prototype.log = function (type)
    {
        //console.trace();
        if (this._logging) {
            if (arguments.length === 2)
                console[type](Date.now(), arguments[1]);
            else
                if (arguments.length === 3)
                    console[type](Date.now(), arguments[1], arguments[2]);
            else
                if (arguments.length === 4)
                    console[type](Date.now(), arguments[1], arguments[2], arguments[3]);
             else
                if (arguments.length === 5)
                    console[type](Date.now(), arguments[1], arguments[2], arguments[3],arguments[4]);
            else
                console[type](Date.now(), arguments);
        }
    }

    module.export = Logger;
    
    return module.export;
    
});

