/* global define: true, console: true */
// Allows using define in node.js without requirejs
// Require.js : require({moduleId}) -> {moduleId} translated to a path (using baseUrl+path configuration)
//if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function (require, exports, module) {

    function Logger(log)
    {
        
        
         // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty
        Object.defineProperty(this, "logging",
                              { get : function(){ return this._logging; },
                                set : function(newValue){ this._logging = newValue; } });
        
        if (log)
           this.logging = true;
        else
            this.logging = false;
       
    }
    
        
    Logger.prototype.log = function (type)
    {
       // console.trace();
        if (this.logging && console[type]) {
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
        } else if (!console[type])
            console.warn(Date.now(),'Unknown console source '+type, arguments);
    };
    
    Logger.prototype.time = function (name)
    {
        if (this.logging && console.time)
            console.time(name);
            
    };
    
    Logger.prototype.timeEnd = function (name)
    {
        if (this.logging && console.timeEnd)
                console.timeEnd(name);
    };

    module.export = Logger;
    
    return module.export;
    
});

