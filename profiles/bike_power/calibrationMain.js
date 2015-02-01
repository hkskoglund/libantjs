/* global define: true, DataView: true */

define(['profiles/mainPage'], function _requireDefineCalibrationMain(MainPage) {

    'use strict';

    function CalibrationMain(configuration, broadcast, profile,pageNumber) {

        MainPage.call(this,configuration, broadcast, profile,pageNumber);
    }

    CalibrationMain.prototype = Object.create(MainPage.prototype);
    CalibrationMain.prototype.constructor = CalibrationMain;

    CalibrationMain.prototype.ID = {
        REQUEST_MANUAL_ZERO : 0xAA,
        0xAA : 'Calibration Request: Manual Zero',

        REQUEST_AUTO_ZERO_CONFIGURATION : 0xAB,
        0xAB : 'Calibration Request: Auto Zero Configuration',

        RESPONSE_MANUAL_ZERO_SUCCESS : 0xAC,
        0xAC : 'Calibration Response: Manual Zero Successful',

        RESPONSE_FAILED: 0xAF,
        0xAF : 'Calibration Response: Failed',

        CTF_POWER_SENSOR_DEFINED_MESSAGE : 0x10,
        0x10 : 'Crank Torque Frequency (CTF) Power sensor Defined Message',

        AUTO_ZERO_SUPPORT : 0x12,
        0x12 : 'Auto Zero Support',

        REQUEST_CUSTUM_CALIBRATION_PARAMETER : 0xBA,
        0xBA : 'Custom Calibration Parameter Request',

        RESPONSE_CUSTUM_CALIBRATION_PARAMETER : 0xBB,
        0xBB : 'Custum Calibration Parameter Response',

        UPDATE_CUSTUM_CALIBRATION_PARAMETER : 0xBC,
        0xBC : 'Custum Calibration Parameter Update',

        RESPONSE_UPDATE_CUSTUM_CALIBRATION_PARAMETER : 0xBD,
        0xBD : 'Custom Calibration Parameter Update Response'
    };

    CalibrationMain.prototype.AUTO_ZERO = {
       AUTO_ZERO_OFF : 0x00,
        0x00 : 'Auto Zero is OFF',

        AUTO_ZERO_ON : 0x01,
        0x01 : 'Auto Zero is ON',

        AUTO_ZERO_NOT_SUPPORTED : 0xFF,
        0xFF : 'Auto Zero Is Not Supported'
    };
/*

    CalibrationMain.prototype.PEDAL_POWER_NOT_USED = 0xFF;
    CalibrationMain.prototype.BIT_MASK = {
        PEDAL_POWER_PERCENT : parseInt("01111111",2),
        PEDAL_DIFFERENTIATION : parseInt("10000000",2)
    };
*/

     CalibrationMain.prototype.readResponse = function ()
    {
         var data = this.broadcast.data,
             dataView = new DataView(data.buffer);

         this.calibrationID = data[1];

         switch (this.calibrationID)
         {
                 case 0xAC : // Calibration Successfull
                 case 0xAF : // Calibration Failed

                     this.autoZeroStatus = data[2];

                     // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView/getInt16

                     // Spec. p 45 ANT+ Managed Network Document – Bicycle Power Device Profile, 4.1

                     // This value is passed back from the sensor to the display to provide an indication to the user about the quality of the calibration
                     // It is intended to indicate the result of the calibration to the user. If the calibration data value is significantly different from the number the user is accustomed to seeing, it may indicate to the user that calibration should be performed again or that the power sensor requires service
                     this.calibrationData = dataView.getInt16(data.byteOffset+6,true);

                 break;
         }

    };

     CalibrationMain.prototype.readCommonBytes = function ()
    {
        this.readResponse();
    };

    CalibrationMain.prototype.toString = function ()
    {
        return 'Calibration ID: '+this.ID[this.calibrationID]+' (0x'+this.calibrationID.toString(16)+'), '+this.AUTO_ZERO[this.autoZeroStatus]+' (0x'+this.autoZeroStatus.toString(16)+'), Calibration data '+this.calibrationData+' (0x'+this.calibrationData.toString(16)+')';
    };

    return CalibrationMain;
});
