/* global define: true */

//if (typeof define !== 'function') { var define = require('amdefine')(module); }

define(function () {
    'use strict';
    // These settings are static. So its not a problem to have them in a .js file for easier require by require.js
    // Another option: Probably it would be possible to use a JSON file that's read by a XmlHttpRequest
    return {
        "networkKey": {
            "ANT+": [
                "0xB9",
                "0xA5",
                "0x21",
                "0xFB",
                "0xBD",
                "0x72",
                "0xC3",
                "0x45"
            ]
        },
        "RFfrequency": {
            "ANT+": 57
        }
};
});
