/* global define: true, console: true, Uint8Array: true */
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
        //console.time('logger');

        var now = new Date(),
            nowStr = now.getTime(),
            myArguments = [];
        //+ ' ' + now.toLocaleTimeString(); // .toLocaleTimeString is very expensive on performance - maybe candidate for removal

        // console.trace();
        var formatUint8Array = function (arg)
        {
            if (arg instanceof Uint8Array) {
                var i, msg = 'Uint8Array < ', MAX_BYTES_TO_FORMAT = 32, prefix;
                for (i = 0; i < arg.length; i++) {
                    if (i < MAX_BYTES_TO_FORMAT) {
                        if (arg[i] < 10)
                            prefix = '0';
                        else prefix = '';
                        msg += prefix+arg[i].toString(16) + ' ';
                    }
                    else {
                        msg += '...>';
                        break;
                    }
                }

                if (i === arg.length)
                    msg += '>';

                return msg;
            } else
                return arg;
            };

        if (this.logging && console[type]) {
           
                myArguments.push(nowStr);

                for (var argNr = 1, len = arguments.length; argNr < len; argNr++)
                {
                    if (arguments[argNr] instanceof Uint8Array)
                        myArguments.push(formatUint8Array(arguments[argNr]));

                    myArguments.push(arguments[argNr]);
                }

                console[type].apply(console, myArguments);
            
               
        } else if (!console[type])
            console.warn(nowStr, 'Unknown console function ' + type, arguments);
        //console.timeEnd('logger');
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

