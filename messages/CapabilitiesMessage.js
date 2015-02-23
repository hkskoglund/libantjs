/* global define: true */

if (typeof define !== 'function'){ var define = require('amdefine')(module); }

define(function (require, exports, module){

    'use strict';

    var Message = require('./Message');

    function CapabilitiesMessage(data)    {

      Message.call(this,data);

    }

    CapabilitiesMessage.prototype = Object.create(Message.prototype);

    CapabilitiesMessage.prototype.constructor = CapabilitiesMessage;


    // Inspired by Dynastream Android SDK 4.0.0
    CapabilitiesMessage.prototype.getNumberOfChannels = function ()
    {
        return this.content[0];
    };

    // Inspired by Dynastream Android SDK 4.0.0
    CapabilitiesMessage.prototype.getNumberOfNetworks = function ()
    {
        return this.content[1];
    };

    // ANT Message Protocol and Usage. rev 5.0b - page 115
    CapabilitiesMessage.prototype.decode = function (data){

        this.MAX_CHAN =  this.content[0];
        this.MAX_NET = this.content[1];

        var standardOptions = this.content[2],

            advancedOptions = this.content[3],

        // Documentation update http://www.thisisant.com/forum/viewthread/4250/

            advancedOptions2 = this.content[4],

            advancedOptions3 = this.content[6],

            advancedOptions4 = this.content[7];

        this.maxSensRcoreChannels =  this.content[5];

        this.standardOptions = {
            value: standardOptions.toString(2) + "b = " + standardOptions,
            CAPABILITIES_NO_RECEIVE_CHANNELS : standardOptions & 0x01,
            CAPABILITIES_NO_TRANSMIT_CHANNELS : standardOptions & 0x02,
            CAPABILITIES_NO_RECEIVE_MESSAGES : standardOptions & (1 << 3),
            CAPABILITIES_NO_TRANSMIT_MESSAGES : standardOptions & (1 << 4),
            CAPABILITIES_NO_ACKD_MESSAGES : standardOptions & (1 << 5),
            CAPABILITIES_NO_BURST_MESSAGES : standardOptions & (1 << 6),
        };

        this.advancedOptions = {
            value: advancedOptions.toString(2) + " = " + advancedOptions,
            CAPABILITIES_NETWORK_ENABLED : advancedOptions & 0x02,
            CAPABILITIES_SERIAL_NUMBER_ENABLED : advancedOptions & (1 << 3),
            CAPABILITIES_PER_CHANNEL_TX_POWER_ENABLED : advancedOptions & (1 << 4),
            CAPABILITIES_LOW_PRIORITY_SEARCH_ENABLED : advancedOptions & (1 << 5),
            CAPABILITIES_SCRIPT_ENABLED : advancedOptions & (1 << 6),
            CAPABILITIES_SEARCH_LIST_ENABLED : advancedOptions & (1 << 7),
        };

        if (advancedOptions2 !== undefined)
        this.advancedOptions2 = {
            value: advancedOptions2.toString(2) + "b = " + advancedOptions2,
            CAPABILITIES_LED_ENABLED : advancedOptions2 & 0x01,
            CAPABILITIES_EXT_MESSAGE_ENABLED : advancedOptions2 & 0x02,
            CAPABILITIES_SCAN_MODE_ENABLED : advancedOptions2 & (1 << 2),
            CAPABILITIES_PROXY_SEARCH_ENABLED : advancedOptions2 & (1 << 4),
            CAPABILITIES_EXT_ASSIGN_ENABLED : advancedOptions2 & (1 << 5),
            CAPABILITIES_FS_ANTFS_ENABLED : advancedOptions2 & (1 << 6), // (1 << n) = set bit n high (bit numbered from 0 - n)
        };

        // ANT USB 2 does not have advanced options 3, so it will be undefined

        if (advancedOptions3 !== undefined)
            this.advancedOptions3 = {
                value : advancedOptions3.toString(2) + "b = " + advancedOptions3,
                CAPABILITIES_ADVANCED_BURST_ENABLED : advancedOptions3 & 0x01,
                CAPABILITIES_EVENT_BUFFERING_ENABLED : advancedOptions3 & 0x02,
                CAPABILITIES_EVENT_FILTERING_ENABLED : advancedOptions3 & (1 << 2),
                CAPABILITIES_HIGH_DUTY_SEARCH_ENABLED : advancedOptions3 & (1 << 3),
                CAPABILITIES_SEARCH_SHARING_ENABLED : advancedOptions3 & (1 << 4),

                CAPABILITIES_SELECTIVE_DATA_ENABLED : advancedOptions3 & (1 << 6),
                CAPABILITIES_ENCRYPTED_CHANNEL_ENABLED : advancedOptions3 & (1 << 7)
            };

        if (advancedOptions4 !== undefined)
            this.advancedOptions4 = {
                value: "MSB " + advancedOptions4.toString(2) + "b " + advancedOptions4,
                CAPABILITIES_RFACTIVE_NOTIFICATION_ENABLED: advancedOptions4 & 0x01 // Bit 0
                // Bit 1-7 reserved
            };

    };

    CapabilitiesMessage.prototype.toString = function ()    {

        var msg = Message.prototype.toString.call(this) + " Channels " + this.getNumberOfChannels() + " | Networks " + this.getNumberOfNetworks()+ ' | sensRcore channels ' + this.maxSensRcoreChannels+' | ';

        msg += (this.standardOptions.CAPABILITIES_NO_RECEIVE_CHANNELS ? '+' : '-')+ "No receive channels | ";

        msg += (this.standardOptions.CAPABILITIES_NO_TRANSMIT_CHANNELS ? '+' : '-')+  "No transmit channels | ";

        msg += (this.standardOptions.CAPABILITIES_NO_RECEIVE_MESSAGES ? '+' : '-')+ "No receive messages | ";

        msg +=(this.standardOptions.CAPABILITIES_NO_TRANSMIT_MESSAGES ? '+' : '-')+ "No transmit messages | " ;

        msg += (this.standardOptions.CAPABILITIES_NO_ACKD_MESSAGES ? '+' : '-')+ "No ackd. messages | ";

        msg += (this.standardOptions.CAPABILITIES_NO_BURST_MESSAGES ? '+' : '-')+ "No burst messages | ";


        msg += (this.advancedOptions.CAPABILITIES_NETWORK_ENABLED ? '+' : '-')+ "Network | ";

        msg += (this.advancedOptions.CAPABILITIES_SERIAL_NUMBER_ENABLED ? '+' : '-')+ "Serial number | ";

        msg += (this.advancedOptions.CAPABILITIES_PER_CHANNEL_TX_POWER_ENABLED ? '+' : '-')+ "Per channel Tx Power | ";

        msg += (this.advancedOptions.CAPABILITIES_LOW_PRIORITY_SEARCH_ENABLED ? '+' : '-')+ "Low priority search | " ;

        msg += (this.advancedOptions.CAPABILITIES_SCRIPT_ENABLED ? '+' : '-')+ "Script | ";

        msg += (this.advancedOptions.CAPABILITIES_SEARCH_LIST_ENABLED ? '+' : '-')+ "Search list | ";


        if (this.advancedOptions2)        {
          msg +=(this.advancedOptions2.CAPABILITIES_LED_ENABLED ? '+' : '-')+  "Led | ";

          msg += (this.advancedOptions2.CAPABILITIES_EXT_MESSAGE_ENABLED ? '+' : '-')+ "Extended messages | ";

          msg += (this.advancedOptions2.CAPABILITIES_SCAN_MODE_ENABLED ? '+' : '-')+ "Scan mode | ";

          msg += (this.advancedOptions2.CAPABILITIES_PROXY_SEARCH_ENABLED ? '+' : '-')+ "Proximity search | ";

          msg += (this.advancedOptions2.CAPABILITIES_EXT_ASSIGN_ENABLED ? '+' : '-')+"Extended assign | ";

          msg += (this.advancedOptions2.CAPABILITIES__FS_ANTFS_ENABLED ? '+' : '-')+ "ANT-FS | ";

        }

        if (this.advancedOptions3)        {
            msg +=  (this.advancedOptions3.CAPABILITIES_ADVANCED_BURST_ENABLED ? '+' : '-')+ 'Advanced burst |';

            msg += (this.advancedOptions3.CAPABILITIES_EVENT_BUFFERING_ENABLED ? '+' : '-')+"Event buffering | ";

            msg += (this.advancedOptions3.CAPABILITIES_EVENT_FILTERING_ENABLED ? '+' : '-')+"Event filtering | ";

            msg += (this.advancedOptions3.CAPABILITIES_HIGH_DUTY_SEARCH_ENABLED ? '+' : '-')+"High duty search | ";

            msg +=  (this.advancedOptions3.CAPABILITIES_SEARCH_SHARING_ENABLED ? '+' : '-')+"Search sharing | ";

            msg += (this.advancedOptions3.CAPABILITIES_ENCRYPTED_CHANNEL_ENABLED ? '+' : '-')+"Encrypted channel | ";

            msg += (this.advancedOptions3.CAPABILITIES_SELECTIVE_DATA_ENABLED  ? '+' : '-')+"Selective data update | ";

        }

        if (this.advancedOptions4)        {
          msg += (this.advancedOptions4.CAPABILITIES_RFACTIVE_NOTIFICATION_ENABLED ? '+' : '-')+"RF Active notification | ";

        }

        if (this.standardOptions !== undefined) msg += 'S.O '+this.standardOptions.value+ ' |';
        if (this.advancedOptions !== undefined) msg += ' A.O '+this.advancedOptions.value+'|';
        if (this.advancedOptions2 !== undefined) msg += ' A.O2 '+this.advancedOptions2.value+'|';
        if (this.advancedOptions3 !== undefined) msg += ' A.O3 '+this.advancedOptions3.value+'|';
        if (this.advancedOptions4 !== undefined) msg += ' A.O4 '+this.advancedOptions4.value;

        return msg;
    };

    module.exports = CapabilitiesMessage;
    return module.exports;
});
