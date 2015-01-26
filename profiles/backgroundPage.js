/* global define: true */

define(['profiles/Page'],function _requireDefineGenericPage(GenericPage) {

    'use strict';

    function BackgroundPage(configuration, broadcast,profile,pageNumber) {

         GenericPage.call(this,configuration, broadcast,profile,pageNumber);

    }

    BackgroundPage.prototype = Object.create(GenericPage.prototype);
    BackgroundPage.prototype.constructor = BackgroundPage;

    BackgroundPage.prototype.COMMON.PAGE0x50 = 0x50;
    BackgroundPage.prototype.COMMON.PAGE0x51 = 0x51;
    BackgroundPage.prototype.COMMON.PAGE0x52 = 0x52;

    BackgroundPage.prototype.manufacturers = {

            garmin:	1,
            garmin_fr405_antfs :	2,
            zephyr	:3,
            dayton	:4,
            idt	:5,
            srm	:6,
            quarq	:7,
            ibike	:8,
            saris	:9,
            spark_hk	:10,
            tanita	:11,
            echowell	:12,
            dynastream_oem	:13,
            nautilus	:14,
            dynastream	:15,
            timex	:16,
            metrigear	:17,
            xelic	:18,
            beurer	:19,
            cardiosport	:20,
            a_and_d	:21,
            hmm	:22,
            suunto	:23,
            thita_elektronik	:24,
            gpulse	:25,
            clean_mobile	:26,
            pedal_brain	:27,
            peaksware	:28,
            saxonar	:29,
            lemond_fitness	:30,
            dexcom	:31,
            wahoo_fitness	:32,
            octane_fitness	:33,
            archinoetics	:34,
            the_hurt_box	:35,
            citizen_systems	:36,
            magellan	:37,
            osynce	:38,
            holux	:39,
            concept2	:40,
            one_giant_leap	:42,
            ace_sensor	:43,
            brim_brothers	:44,
            xplova	:45,
            perception_digital	:46,
            bf1systems	:47,
            pioneer	:48,
            spantec	:49,
            metalogics	:50,
            _4iiiis	:51,
            seiko_epson	:52,
            seiko_epson_oem	:53,
            ifor_powell	:54,
            maxwell_guider	:55,
            star_trac	:56,
            breakaway	:57,
            alatech_technology_ltd	:58,
            mio_technology_europe	:59,
            rotor	:60,
            geonaute	:61,
            id_bike	:62,
            specialized	:63,
            wtek	:64,
            physical_enterprises	:65,
            north_pole_engineering	:66,
            bkool	:67,
            cateye	:68,
            stages_cycling	:69,
            sigmasport	:70,
            tomtom	:71,
            peripedal	:72,
            wattbike	:73,
            moxy	:76,
            ciclosport	:77,
            powerbahn	:78,
            acorn_projects_aps	:79,
            lifebeam	:80,
            bontrager	:81,
            wellgo	:82,
            scosche	:83,
            magura	:84,
            woodway	:85,
            elite	:86,
            nielsen_kellerman	:87,
            dk_city	:88,
            tacx	:89,
            direction_technology	:90,
            magtonic	:91,
            _1partcarbon	:92,
            inside_ride_technologies	:93,
            development	:255,
            healthandlife	:257,
            lezyne	:258,
            scribe_labs	:259,
            actigraphcorp	:5759

    };


    BackgroundPage.prototype.getManufacturer = function (manufacturerID)
    {
        // Imported from profile.xls in FIT SDK v13.2

      var   ownProperties = Object.getOwnPropertyNames(this.manufacturers),
            manufacturer;

        for (var property = 0; property < ownProperties.length; property++)
        {
            if (manufacturerID === this.manufacturers[ownProperties[property]])
            {
                manufacturer = ownProperties[property];
                break;
            }
        }

        if (manufacturer === undefined) // Not found
        {
            return '';
        } else
        {
            if (manufacturer.charAt(0) === '_') // Strip off _ prefix
            {
                return manufacturer.substr(1);
            }
            else
            {
                return manufacturer;
            }
        }
    };

    return BackgroundPage;

});
