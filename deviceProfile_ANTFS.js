"use strict";
//console.log(module);

var DeviceProfile = require('./deviceProfile.js');
var CRC = require('./crc.js');
//console.log("Resolved ant-lib",require.resolve('ant-lib'));
var ANT = require('ant-lib');
var fs = require('fs');
var Channel = require('./channel.js');

//console.log("ANT IS", ANT);


function DeviceProfile_ANTFS(nodeInstance) {
    DeviceProfile.call(this); // Call parent
    this.nodeInstance = nodeInstance;

    //this.nodeInstance.ANT.addListener(ANT.prototype.EVENT.BROADCAST, this.broadCastDataParser);
    //this.nodeInstance.ANT.addListener(ANT.prototype.EVENT.BURST, this.parseBurstData);

    this.state = DeviceProfile_ANTFS.prototype.STATE.INIT; // Init state before first LINK beacon received from device
    //this.stateCounter[DeviceProfile_ANTFS.prototype.STATE.LINK_LAYER] = 0;
    //this.stateCounter[DeviceProfile_ANTFS.prototype.STATE.AUTHENTICATION_LAYER] = 0;
    //this.stateCounter[DeviceProfile_ANTFS.prototype.STATE.TRANSPORT_LAYER] = 0;
    //this.CRCUtil = new CRC();

    // Verify that root directory exists

    fs.exists(DeviceProfile_ANTFS.prototype.ROOT_DIR, function (exists) {
        if (!exists) {
            console.log("Root directory does not exists");
            fs.mkdir(DeviceProfile_ANTFS.prototype.ROOT_DIR, function completionCB() {
                console.log("New root directory created at " + DeviceProfile_ANTFS.prototype.ROOT_DIR);
            });
        } else
            console.log(Date.now()+ " Root directory (storage of device data)", DeviceProfile_ANTFS.prototype.ROOT_DIR);
    });

}

DeviceProfile_ANTFS.prototype = DeviceProfile.prototype;  // Inherit properties/methods

DeviceProfile_ANTFS.constructor = DeviceProfile_ANTFS;  // Update constructor

DeviceProfile_ANTFS.prototype = {

    CHANNEL_PERIOD: 4096,

    SEARCH_WAVEFORM: [0x53, 0x00],

    BEACON_ID: 0x43,

    STATE: {
        INIT: 0x0F,
        LINK_LAYER: 0x00,
        AUTHENTICATION_LAYER: 0x01,
        TRANSPORT_LAYER: 0x02,
        BUSY: 0x03,
        0x00: "LINK State",
        0x01: "AUTHENTICATION State",
        0x02: "TRANSPORT State",
        0x03: "BUSY State",
        0x0F: "INIT State"
    },

    // ANTFS TS p. 50 - commands are send either as acknowledged data or bursts depending on payload size
    // COMMAND format : p. 49 ANTFS Command/Response ID = 0x44, Command, Parameters ...
    COMMAND_ID: {
        COMMAND_RESPONSE_ID: 0x44,
        LINK: 0x02,
        DISCONNECT: 0x03,
        AUTHENTICATE: 0x04,
        PING: 0x05,
        DOWNLOAD: 0x09,
        UPLOAD: 0x0A,
        ERASE: 0x0B,
        UPLOAD_DATA: 0x0C,
        AUTHENTICATE_RESPONSE: 0x84,
        DOWNLOAD_RESPONSE: 0x89,
        ERASE_RESPONSE: 0x8B
    },

    // ANTFS TS p. 51
    RESPONSE_ID: {
        authenticate: 0x84,
        download: 0x89,
        upload: 0x8A,
        erase: 0x8b,
        upload_data: 0x8c
    },

    BEACON_CHANNEL_PERIOD: {
        HzHalf: 0x00, // 0.5 Hz
        Hz1: 0x01,
        Hz2: 0x02,
        Hz4: 0x03,
        Hz8: 0x04, // 8 Hz
        0x00: "0.5 Hz (65535)", // 000
        0x01: "1 Hz (32768)",   // 001
        0x02: "2 Hz (16384)",   // 010
        0x03: "4 Hz (8192)",    // 011
        0x04: "8 Hz (4096)",    // 100
        0x07: "Match established channel period (broadcast ANT-FS only)" // 111
    },

    AUTHENTICATION_TYPE: {
        PASS_THROUGH: 0x00,
        PAIRING_ONLY: 0x02,
        PASSKEY_AND_PAIRING_ONLY: 0x03,
        0x00: "Pass-through supported (pairing & passkey optional)",
        0x02: "Pairing only",
        0x03: "Passkey and Pairing only"
    },

    DISCONNECT_COMMAND: {
        RETURN_TO_LINK_LAYER: 0x00,
        RETURN_TO_BROADCAST_MODE: 0x01
        // 2-127 reserved
        // 128 - 255 device specific disconnect
    },

    AUTHENTICATE_COMMAND: {
        PROCEED_TO_TRANSPORT: 0x00, // Pass-through
        REQUEST_CLIENT_DEVICE_SERIAL_NUMBER: 0x01,
        REQUEST_PAIRING: 0x02,
        REQUEST_PASSKEY_EXCHANGE: 0x03
    },

    FRIENDLY_NAME: "GETFIT.JS",

    INITIAL_DOWNLOAD_REQUEST: {
        CONTINUATION_OF_PARTIALLY_COMPLETED_TRANSFER: 0x00,
        NEW_TRANSFER: 0x01
    },

    DOWNLOAD_RESPONSE: {
        REQUEST_OK: 0x00,
        CRC_INCORRECT: 0x05,
        0x00: "Download Request OK",
        0x01: "Data does not exist",
        0x02: "Data exists but is not downloadable",
        0x03: "Not ready to download",
        0x04: "Request invalid",
        0x05: "CRC incorrect"
    },

    ERASE_RESPONSE: {
        ERASE_SUCCESSFULL: 0x00,
        ERASE_FAILED: 0x01,
        NOT_READY: 0x02,
        0x00: "Erase successfull",
        0x01: "Erase failed",
        0x02: "Not ready"
    },

    RESERVED_FILE_INDEX: {
        DIRECTORY_STRUCTURE: 0x00,
        // 0xFC00 - 0xFFFD Reserved
        COMMAND_PIPE: 0xFFFE,
        // 0xFFFF - Reserved
    },

    AUTHENTICATE_RESPONSE: {
        CLIENT_SN: 0x00,
        ACCEPT: 0x01,
        REJECT: 0x02,
        0x00: "Client Device Serial Number",
        0x01: "Accept of pairing or passkey",
        0x02: "Reject"
    },

    DOWNLOAD_BUFFER_MB: 16, // Size of download buffer in MB

    REQUEST_BURST_RESPONSE_DELAY: 3000, // Time in ms. to wait for burst response on a request before retrying previous request

    ROOT_DIR: process.env.HOME + '\\getFIT-archive',

    NODECOMMAND: {
        DOWNLOAD_MULTIPLE: 0x03,
        DOWNLOAD_ALL: 0x02,
        DOWNLOAD_NEW: 0x00,
        ERASE_MULTIPLE: 0x01,
    },

    REQUEST_TRANSFER_TYPE : {
        ACKNOWLEDGED : 0x00,
        BURST : 0x01
    },

    REQUEST_TYPE : {
        DOWNLOAD: 0x00,
        ERASE : 0x01
    },

    REQUEST_STATE: {
        0x00 : "request" ,
        REQUEST : 0x00,
        SENT: 0x01,
        0x01 : "sent",
        ERROR: 0x02,
        0x02 : "error",
        BUSY: 0x03,
        0x03 : "busy"
    },

    FILE_TYPE : {
        FIT : 0x80
    },

    setHomeDirectory: function (homeDir) {
        var self = this; // Keep our this reference in callbacks please!

        this.homeDirectory = homeDir;

        fs.exists(this.homeDirectory, function (exists) {
            if (!exists) {
                // try {
                fs.mkdir(self.homeDirectory, function completionCB() {
                    console.log(Date.now() + " Created home directory at " + self.homeDirectory);
                });
                //} catch (e) {
                //    console.log(Date.now() + " Could not create home directory ",util.inspect(e));
                //    throw e;
                //}
            } else
                console.log(Date.now() + " Setting home directory to " + self.homeDirectory);
        });
    },

    getHomeDirectory: function () {
        return this.homeDirectory;
    },

    parseBurstData: function (channelNr, data, parser) {
        var self = this, beacon, numberOfPackets = data.length / 8,
            authenticate_response = {}, packetNr,
            download_response = {}, currentCRCSeed,
            erase_response = {},
            resumeIndex,
            resumeDataOffset,
             resumeCRCSeed,
             currentDataOffset,
            homeDirectory,
            downloadRequestType;

        function removeLastBlock() {
            // Remove data block with CRC error
            self.deviceProfile.dataOffset.pop();
            self.deviceProfile.dataLength.pop();
            self.deviceProfile.CRCSeed.pop();
        }

        function processRequestCallback() {
            // Call callback if requested
            if (typeof self.deviceProfile.request.callback === "function")
                self.deviceProfile.request.callback.call(self);
            else
                console.warn(Date.now() + " No request callback specified");
        }

        function repeatLastRequest() {
            console.log(Date.now() + " Repeat request", self.deviceProfile.request);

            if (self.deviceProfile.request.request === DeviceProfile_ANTFS.prototype.REQUEST_TYPE.DOWNLOAD) {
                self.nodeInstance.deviceProfile_ANTFS.sendDownloadRequest.call(self, self.deviceProfile.request.dataIndex, self.deviceProfile.request.dataOffset,
                                       self.deviceProfile.request.initialRequest, self.deviceProfile.request.CRCSeed, 0, self.deviceProfile.request.callback); // Reuse previous callback for new request

            }
            else
                console.warn(self.deviceProfile.request.request + " request not implemented");
        }

        if (channelNr !== self.number) // Filter out burst for other channels
        {
            console.error(Date.now() + " Received burst data for channel ", channelNr, " intended for channel ", self.number);
            return;
        }
        if (self.deviceProfile.timeoutID) {
            clearInterval(self.deviceProfile.timeoutID);
            self.deviceProfile.timeoutRetry = 0;
        }

        //console.log("Got burst data in device profile ANT-FS", data);

        //console.log(Date.now() + " Received ", numberOfPackets, " packets with a total length of ", data.length, " bytes");

        //for (packetNr = 0; packetNr < numberOfPackets; packetNr++)
        //    console.log(packetNr, data.slice(packetNr * 8, 8 + packetNr * 8));

        if (data[0] !== DeviceProfile_ANTFS.prototype.BEACON_ID)
            console.error("Expected beacon id. (0x43) in the first packet of burst payload", data);
        else {
            // Packet 1 BEACON
            beacon = this.nodeInstance.deviceProfile_ANTFS.parseClientBeacon.call(this,data, true);

            if (beacon.hostSerialNumber !== this.nodeInstance.ANT.serialNumber) {
                console.warn("Beacon in bulk transfer header/packet 1, was for ", beacon.hostSerialNumber, ", our device serial number is ", this.nodeInstance.ANT.serialNumber, "beacon packet ", data);

            } else {

                console.log(Date.now(), beacon.toString(), " burst data length:", data.length);

                self.deviceProfile.lastBeacon = { beacon: beacon, timestamp: Date.now() };

                // Packet 2 ANT-FS RESPONSE
                if (data[8] !== DeviceProfile_ANTFS.prototype.COMMAND_ID.COMMAND_RESPONSE_ID) {
                    console.error("Expected ANT-FS COMMAND ID 0x44 at start of packet 2", data, "bytes:", data.length);
                    repeatLastRequest();
                }
                else {

                    // ANT-FS Command responses
                    switch (data[9]) {
                        // P. 56 ANT-FS spec.
                        case DeviceProfile_ANTFS.prototype.COMMAND_ID.AUTHENTICATE_RESPONSE:

                            authenticate_response.responseType = data[10];
                            authenticate_response.authenticationStringLength = data[11];

                            if (authenticate_response.responseType === DeviceProfile_ANTFS.prototype.AUTHENTICATE_RESPONSE.CLIENT_SN) // For client serial number
                            {
                                authenticate_response.clientSerialNumber = data.readUInt32LE(12);
                                // in this case, authentication string will be the friendly name of the client device
                                if (authenticate_response.authenticationStringLength > 0) {
                                    authenticate_response.authenticationString = data.toString('utf8', 16, 16 + authenticate_response.authenticationStringLength);
                                    authenticate_response.clientFriendlyName = authenticate_response.authenticationString;
                                }

                                // Setup home directory for device - and create device directory under root directory
                                homeDirectory = DeviceProfile_ANTFS.prototype.ROOT_DIR + '\\' + authenticate_response.clientSerialNumber;

                                self.deviceProfile.setHomeDirectory(homeDirectory);

                                if (typeof self.deviceProfile.request.callback === "function")
                                    self.deviceProfile.request.callback();
                                else
                                    console.log(Date.now() + " No callback specified after authentication response for client device serial number");
                            }

                            // Accept of pairing bulk response 
                            // Packet 1 : BEACON            <Buffer 43 24 03 03 96 99 27 00
                            // Packet 2 : ANT-FS RESPONSE           44 84 01 08 00 00 00 00 
                            // Packet 3 : Authentication String :   36 58 b2 a7 8b 3d 2a 98 

                            if (authenticate_response.responseType === DeviceProfile_ANTFS.prototype.AUTHENTICATE_RESPONSE.ACCEPT) // Accept of pairing request or the provided passkey
                            {
                                if (authenticate_response.authenticationStringLength > 0) {
                                    authenticate_response.authenticationString = data.slice(16, 16 + authenticate_response.authenticationStringLength); // Passkey
                                    // TO DO : write to file client serial number + friendlyname + passkey + { channel id (device nr./type+transmission type) ? }
                                    fs.writeFile(self.deviceProfile.getHomeDirectory() + '\\passkey.BIN', authenticate_response.authenticationString, function (err) {
                                        if (err)
                                            console.log(Date.now() + " Error writing to passkey file", err);
                                        else
                                            console.log(Date.now() + " Saved passkey received from device", authenticate_response.authenticationString, "to file : ", self.deviceProfile.getHomeDirectory() + '\\passkey.BIN');
                                    });
                                }
                            }

                            if (authenticate_response.responseType === DeviceProfile_ANTFS.prototype.AUTHENTICATE_RESPONSE.REJECT) // Reject
                            {
                                console.log("Authorization rejected (pairing not accepted or wrong passkey provided)");
                            }

                            // add authenticateResponse to device profile instance
                            self.deviceProfile.authenticate_response = authenticate_response;

                            console.log(Date.now(), authenticate_response, DeviceProfile_ANTFS.prototype.AUTHENTICATE_RESPONSE[authenticate_response.responseType]);
                            break;

                            // Observation : FR 910XT sends data in chuncks of 512 bytes

                        case DeviceProfile_ANTFS.prototype.COMMAND_ID.DOWNLOAD_RESPONSE:
                            // Downloaded file is sent as bulk data is blocks

                            // Packet 2
                            download_response.response = data[10];
                            download_response.responseFriendly = DeviceProfile_ANTFS.prototype.DOWNLOAD_RESPONSE[data[10]];

                            if (download_response.response === DeviceProfile_ANTFS.prototype.DOWNLOAD_RESPONSE.REQUEST_OK) {

                                download_response.totalRemainingLength = data.readUInt32LE(12); // Seems to be equal to block size
                                //if (download_response.totalRemainingLength < 512)
                                //    console.log("Remaining bytes:", download_response.totalRemainingLength);

                                // Packet 3
                                download_response.dataOffset = data.readUInt32LE(16);

                                download_response.fileSize = data.readUInt32LE(20);

                                // Packet 4:N-1
                                download_response.data = data.slice(24, -8); // Last packet is 000000 + 2 CRC bytes -> slice it off -> -8

                                if (download_response.dataOffset === 0) {
                                    self.deviceProfile.downloadFile = new Buffer(DeviceProfile_ANTFS.prototype.DOWNLOAD_BUFFER_MB * 1024 * 1024); // First block of data - allocate 16MB buffer -> should handle most cases if client grows file dynamically
                                    self.deviceProfile.dataOffset = [];
                                    self.deviceProfile.CRCSeed = [];
                                    self.deviceProfile.dataLength = [];
                                }

                                //console.log("Response", download_response);
                                //console.log("Download Data length", download_response.data.length);
                                //console.log("Data length", data.length);
                                //console.log("Last packet of data", data.slice(-8));

                                //for (var eNr = 0; eNr < data.length; eNr++)
                                //    console.log(eNr,data[eNr]);

                                // Put the data chunck received into our buffer at the specified offset
                                download_response.data.copy(self.deviceProfile.downloadFile, download_response.dataOffset);


                                // If more data remains, send a new continuation request for more
                                if (download_response.totalRemainingLength > 0) {

                                    // Packet N
                                    download_response.CRC = data.readUInt16LE(data.length - 2);

                                    // Verify CRC

                                    if (download_response.dataOffset === 0) {
                                        if (self.deviceProfile.request.dataIndex !== 0x00)
                                            console.log(Date.now() + " Expecting a file with size : " + download_response.fileSize, "at directory index ", self.deviceProfile.request.dataIndex);
                                        else
                                            console.log(Date.now() + " Expecting a directory with size : " + download_response.fileSize, "at directory index ", self.deviceProfile.request.dataIndex);

                                        currentCRCSeed = CRC.Calc16(download_response.data);
                                        self.deviceProfile.CRCSeed.push(currentCRCSeed);
                                        //downloadRequestType = DeviceProfile_ANTFS.prototype.INITIAL_DOWNLOAD_REQUEST.NEW_TRANSFER;
                                    } else {
                                        currentCRCSeed = self.deviceProfile.CRCSeed[self.deviceProfile.CRCSeed.length - 1];
                                        self.deviceProfile.CRCSeed.push(CRC.UpdateCRC16(currentCRCSeed, download_response.data));
                                        currentCRCSeed = self.deviceProfile.CRCSeed[self.deviceProfile.CRCSeed.length - 1];
                                        //downloadRequestType = DeviceProfile_ANTFS.prototype.INITIAL_DOWNLOAD_REQUEST.CONTINUATION_OF_PARTIALLY_COMPLETED_TRANSFER;
                                    }


                                    self.deviceProfile.dataLength.push(download_response.totalRemainingLength);
                                    self.deviceProfile.dataOffset.push(download_response.dataOffset);
                                    // console.log("offset", download_response.dataOffset, "data length", download_response.data.length,"total remaining",download_response.totalRemainingLength);

                                    if (download_response.CRC !== currentCRCSeed) {

                                        console.warn(Date.now() + " Block ", self.deviceProfile.dataOffset.length - 1, " CRC of data block ", download_response.CRC, " differs from calculated CRC-16 of data block ", currentCRCSeed);

                                        if (self.deviceProfile.dataOffset.length >= 2) {
                                            resumeIndex = self.deviceProfile.dataOffset.length - 2;
                                            currentDataOffset = self.deviceProfile.dataOffset[resumeIndex] + self.deviceProfile.dataLength[resumeIndex];
                                            currentCRCSeed = self.deviceProfile.CRCSeed[resumeIndex];
                                            downloadRequestType = DeviceProfile_ANTFS.prototype.INITIAL_DOWNLOAD_REQUEST.CONTINUATION_OF_PARTIALLY_COMPLETED_TRANSFER;
                                        }
                                        else // CRC error in block 1
                                        {
                                            resumeIndex = 0;
                                            currentDataOffset = 0;
                                            currentCRCSeed = 0;
                                            downloadRequestType = DeviceProfile_ANTFS.prototype.INITIAL_DOWNLOAD_REQUEST.NEW_TRANSFER;
                                        }

                                        // console.log(self.deviceProfile.dataOffset.length, self.deviceProfile.CRCSeed.length);

                                        removeLastBlock();

                                        // Try to resume download with last good CRC
                                        console.log(Date.now() + " Resume block " + resumeIndex + " data offset: " + currentDataOffset + " CRC Seed: " + currentCRCSeed);

                                    } else {
                                        currentDataOffset = download_response.dataOffset + download_response.totalRemainingLength;
                                        downloadRequestType = DeviceProfile_ANTFS.prototype.INITIAL_DOWNLOAD_REQUEST.CONTINUATION_OF_PARTIALLY_COMPLETED_TRANSFER;

                                    }

                                  //  console.log(currentDataOffset, downloadRequestType);

                                    self.nodeInstance.deviceProfile_ANTFS.sendDownloadRequest.call(self, self.deviceProfile.request.dataIndex, currentDataOffset,
                                        downloadRequestType, currentCRCSeed, 0, self.deviceProfile.request.callback); // Reuse previous callback for new request

                                    // Kick in retry if no burst response

                                    self.deviceProfile.timeoutID = setInterval(function retry() {
                                        self.deviceProfile.timeoutRetry++;
                                        if (self.deviceProfile.timeoutRetry < 10) {
                                            console.log(Date.now() + " Received no burst response for previous download request in about ", DeviceProfile_ANTFS.prototype.REQUEST_BURST_RESPONSE_DELAY, "ms. Retrying " + self.deviceProfile.timeoutRetry);

                                            self.nodeInstance.deviceProfile_ANTFS.sendDownloadRequest.call(self, self.deviceProfile.request.dataIndex, currentDataOffset,
                                         downloadRequestType, currentCRCSeed, 0, self.deviceProfile.request.callback);
                                        } else {
                                            console.log(Date.now() + " Something is wrong with the link to the device. Cannot proceed. Reached maximum retries.", self.deviceProfile.timeoutRetry);
                                            process.kill(process.pid, 'SIGINT');
                                        }
                                    }, DeviceProfile_ANTFS.prototype.REQUEST_BURST_RESPONSE_DELAY);

                                } else if (download_response.totalRemainingLength === 0) {

                                    self.deviceProfile.response = {
                                        timestamp: Date.now(),
                                        downloadFile: self.deviceProfile.downloadFile.slice(0, download_response.fileSize)
                                    };

                                    if (self.deviceProfile.request.dataIndex !== DeviceProfile_ANTFS.prototype.RESERVED_FILE_INDEX.DIRECTORY_STRUCTURE) {

                                        var fName = self.deviceProfile.getHomeDirectory() + '\\' + self.deviceProfile.directory.index[self.deviceProfile.request.dataIndex].fileName;
                                        console.log(Date.now() + " Downloaded file ", fName, download_response.fileSize, "bytes");
                                        fs.writeFile(fName, self.deviceProfile.response.downloadFile, function (err) {
                                            if (err)
                                                console.log(Date.now() + " Error writing " + fName, err);
                                            else
                                                console.log(Date.now() + " Saved " + fName);
                                        });

                                    }

                                    processRequestCallback();

                                }
                            } else if (download_response.response === DeviceProfile_ANTFS.prototype.DOWNLOAD_RESPONSE.CRC_INCORRECT) {
                                console.log(Date.now() + " Download response : ", download_response);

                                resumeIndex = self.deviceProfile.dataOffset.length - 2;
                                resumeDataOffset = self.deviceProfile.dataOffset[resumeIndex] + self.deviceProfile.dataLength[resumeIndex];
                                resumeCRCSeed = self.deviceProfile.CRCSeed[resumeIndex];
                                // console.log(self.deviceProfile.dataOffset.length, self.deviceProfile.CRCSeed.length);

                                removeLastBlock();

                                // Try to resume download with last good CRC
                                console.log(Date.now() + " Resume block " + resumeIndex + " data offset: " + resumeDataOffset + " CRC Seed: " + resumeCRCSeed);

                                self.nodeInstance.deviceProfile_ANTFS.sendDownloadRequest.call(self, self.deviceProfile.request.dataIndex, resumeDataOffset,
                                    DeviceProfile_ANTFS.prototype.INITIAL_DOWNLOAD_REQUEST.CONTINUATION_OF_PARTIALLY_COMPLETED_TRANSFER, resumeCRCSeed, 0);

                                self.deviceProfile.timeoutID = setInterval(function retry() {
                                    self.deviceProfile.timeoutRetry++;
                                    if (self.deviceProfile.timeoutRetry < 10) {
                                        console.log(Date.now() + " Received no burst response for previous download request in about ", DeviceProfile_ANTFS.prototype.REQUEST_BURST_RESPONSE_DELAY, "ms . Retrying now.");
                                        self.nodeInstance.deviceProfile_ANTFS.sendDownloadRequest.call(self, self.deviceProfile.request.dataIndex, resumeDataOffset,
                                          DeviceProfile_ANTFS.prototype.INITIAL_DOWNLOAD_REQUEST.CONTINUATION_OF_PARTIALLY_COMPLETED_TRANSFER, resumeCRCSeed, 0);
                                    } else {
                                        console.log(Date.now() + " Lost the link to the device. Cannot proceed.");
                                        process.kill(process.pid, 'SIGINT');

                                    }
                                }, DeviceProfile_ANTFS.prototype.REQUEST_BURST_RESPONSE_DELAY);
                            }
                            else {
                                console.log(Date.now() + " Download response : ", download_response);
                                processRequestCallback();
                            }

                            break;

                        case DeviceProfile_ANTFS.prototype.COMMAND_ID.ERASE_RESPONSE:

                            erase_response.response = data[10];

                            console.log(Date.now() + " Erase response: " + DeviceProfile_ANTFS.prototype.ERASE_RESPONSE[erase_response.response]);

                            if (erase_response.response === DeviceProfile_ANTFS.prototype.ERASE_RESPONSE.ERASE_FAILED ||
                                erase_response.response === DeviceProfile_ANTFS.prototype.ERASE_RESPONSE.NOT_READY) {

                                if (++self.deviceProfile.request.retry <= 3) {
                                    self.nodeInstance.deviceProfile_ANTFS.sendEraseRequest.call(self, self.deviceProfile.request.dataIndex, false);
                                    self.deviceProfile.timeoutID = setInterval(function retry() {
                                        self.deviceProfile.timeoutRetry++;
                                        if (self.deviceProfile.timeoutRetry < 10) {
                                            console.log(Date.now() + " Received no burst response for previous erase request in about", DeviceProfile_ANTFS.prototype.REQUEST_BURST_RESPONSE_DELAY, " ms. Retrying " + self.deviceProfile.timeoutRetry);

                                            self.nodeInstance.deviceProfile_ANTFS.sendEraseRequest.call(self, self.deviceProfile.request.dataIndex, false);
                                        } else {
                                            console.log(Date.now() + " Something is wrong with the link to the device. Cannot proceed.");
                                            process.kill(process.pid, 'SIGINT');
                                        }
                                    }, DeviceProfile_ANTFS.prototype.REQUEST_BURST_RESPONSE_DELAY);
                                }
                                else {
                                    console.log(Date.now() + " Reached maximum number of retries, file is probably not deleted", self.deviceProfile.request.retry);
                                    processRequestCallback();
                                }

                            } else if (erase_response.response === DeviceProfile_ANTFS.prototype.ERASE_RESPONSE.ERASE_SUCCESSFULL) {
                                console.log(Date.now() + " Erased file at index ", self.deviceProfile.request.dataIndex);
                                processRequestCallback();
                            }
                            else
                                console.warn(Date.now() + " Received unknown erase response", erase_response.response);

                            break;

                        default:
                            console.warn(Date.now() + " Not implemented parsing of ANT-FS Command response code ", data[9]);
                            break;
                    }
                }
            }
        }
    },

    ANTFSCOMMAND_Download: function (dataIndex, dataOffset, initialRequest, CRCSeed, maximumBlockSize) {
        //console.log("ANTFSCOMMAND_Download",dataIndex, dataOffset, initialRequest, CRCSeed, maximumBlockSize);

        var payload = new Buffer(16);

        // Packet 1

        payload[0] = DeviceProfile_ANTFS.prototype.COMMAND_ID.COMMAND_RESPONSE_ID; // 0x44;
        payload[1] = DeviceProfile_ANTFS.prototype.COMMAND_ID.DOWNLOAD;
        payload.writeUInt16LE(dataIndex, 2);
        payload.writeUInt32LE(dataOffset, 4);

        // Packet 2

        payload[8] = 0;
        if (typeof initialRequest === "undefined") {
            console.log("Initial request is undefined");
            console.trace();
        }
        payload[9] = initialRequest;

        if (initialRequest === DeviceProfile_ANTFS.prototype.INITIAL_DOWNLOAD_REQUEST.NEW_TRANSFER) {
            if (CRCSeed !== 0)
                console.warn("CRC seed specified is ", CRCSeed, " for new transfer CRC seed should be set to 0 -> forced to 0 now");
            payload.writeUInt16LE(0, 10); // Force CRC seed to 0
        }
        else
            payload.writeUInt16LE(CRCSeed, 10);

        payload.writeUInt32LE(maximumBlockSize, 12);

        return payload;

    },

    // host serial number is available on antInstance.serialNumber if getDeviceSerialNumber has been executed
    ANTFSCOMMAND_Link: function (channelFreq, channelPeriod, hostSerialNumber) {
        var payload = new Buffer(8);

        payload[0] = DeviceProfile_ANTFS.prototype.COMMAND_ID.COMMAND_RESPONSE_ID; // 0x44;
        payload[1] = DeviceProfile_ANTFS.prototype.COMMAND_ID.LINK;
        payload[2] = channelFreq;    // Offset from 2400 Mhz
        payload[3] = channelPeriod; // 0x04 = 8 Hz
        payload.writeUInt32LE(hostSerialNumber, 4);

        return { buffer: payload, friendly: "ANT-FS LINK Command" };
    },

    // p. 52 ANT-FS technical spec.
    ANTFSCOMMAND_Disconnect: function (commandType, timeDuration, applicationSpecificDuration) {
        // timeDuration - 0x00 - Disabled/Invalid
        // application specific duration - 0x00 - Disabled/Invalid
        var payload = new Buffer(4);

        payload[0] = DeviceProfile_ANTFS.prototype.COMMAND_ID.COMMAND_RESPONSE_ID; // 0x44;
        payload[1] = DeviceProfile_ANTFS.prototype.COMMAND_ID.DISCONNECT;
        payload[2] = commandType;
        payload[3] = timeDuration;
        payload[4] = applicationSpecificDuration;

        return { buffer: payload, friendly: "ANT-FS DISCONNECT Command" };
    },

    ANTFSCOMMAND_Authentication: function (commandType, authStringLength, hostSerialNumber) {
        var payload = new Buffer(8);

        payload[0] = DeviceProfile_ANTFS.prototype.COMMAND_ID.COMMAND_RESPONSE_ID; // 0x44;
        payload[1] = DeviceProfile_ANTFS.prototype.COMMAND_ID.AUTHENTICATE;
        payload[2] = commandType;
        payload[3] = authStringLength; // "Set to 0 if no authentication is to be supplied", "string is bursts to the client immediately following this command", "..If Auth String Length parameter is set to 0, this msg. may be sent as an acknowledged message"
        payload.writeUInt32LE(hostSerialNumber, 4);

        return { buffer: payload, friendly: "ANT-FS AUTHENTICATION Command" };
    },

    ANTFSCOMMAND_Erase: function (dataIndex) {
        var payload = new Buffer(4);

        payload[0] = DeviceProfile_ANTFS.prototype.COMMAND_ID.COMMAND_RESPONSE_ID; // 0x44;
        payload[1] = DeviceProfile_ANTFS.prototype.COMMAND_ID.ERASE;
        payload.writeUInt16LE(dataIndex, 2);

        return { buffer: payload, friendly: "ANT-FS ERASE Command" };
    },

                              
    getSlaveChannelConfiguration: function (networkNr, channelNr, deviceNr, deviceType, transmissionType, searchTimeout, startupDirectory) {
        // Setup channel parameters for ANT-FS
        this.channel = new Channel(channelNr, Channel.prototype.CHANNEL_TYPE.receive_channel, networkNr, new Buffer(this.nodeInstance.configuration.network_keys.ANT_FS), startupDirectory);

        this.channel.setChannelId(deviceNr, deviceType, transmissionType, false);
        this.channel.setChannelPeriod(DeviceProfile_ANTFS.prototype.CHANNEL_PERIOD);
        this.channel.setChannelSearchTimeout(searchTimeout); 
        this.channel.setChannelFrequency(ANT.prototype.ANTFS_FREQUENCY);
        this.channel.setChannelSearchWaveform(DeviceProfile_ANTFS.prototype.SEARCH_WAVEFORM);

        // Functions available as callbacks
        this.channel.broadCastDataParser = this.broadCastDataParser || DeviceProfile.prototype.broadCastDataParser;
        this.channel.parseBurstData = this.parseBurstData || DeviceProfile.prototype.parseBurstData; // Called on a complete aggregation of burst packets
        this.channel.channelResponseEvent = this.channelResponseEvent || DeviceProfile.prototype.channelResponseEvent;

        this.channel.addListener(Channel.prototype.EVENT.CHANNEL_RESPONSE_EVENT, this.channel.channelResponseEvent);
        this.channel.addListener(Channel.prototype.EVENT.BROADCAST, this.channel.broadCastDataParser);
        this.channel.addListener(Channel.prototype.EVENT.BURST, this.channel.parseBurstData);

        this.channel.nodeInstance = this.nodeInstance; // Attach channel to nodeInstance
        this.channel.deviceProfile = this; // Attach channel to device profile

        return this.channel;
    },

    channelResponseEvent: function (data) {
        //console.log(Date.now() + " Got channelResponseEvent on ANT-FS channel ", data);
        var self = this, antInstance = this.nodeInstance.ANT;
        
        if (antInstance.isEvent(ANT.prototype.RESPONSE_EVENT_CODES.EVENT_RX_FAIL_GO_TO_SEARCH, data))
            console.log(Date.now() + " ANT-FS Channel " + self.number + " cannot track broadcast anymore, missed to many expected broadcasts from device");
        else if (antInstance.isEvent(ANT.prototype.RESPONSE_EVENT_CODES.EVENT_RX_SEARCH_TIMEOUT, data))
            console.log(Date.now() + " ANT-FS Channel " + self.number + " reached search timeout. Device did not send any ANT data in the search periode.");
        else if (antInstance.isEvent(ANT.prototype.RESPONSE_EVENT_CODES.EVENT_CHANNEL_CLOSED, data))
            console.log(Date.now() + " ANT-FS Channel "+ self.number+" closed.");

    },

    // It seems like the Garmin 910XT ANTFS client open the channel for about 1.75 sec. each 20 seconds. At 8Hz message rate we can expected max 16 beacon messages. -> maybe to conserve power
    // The generates a series of EVENT_RX_FAIL which eventually leads to EVENT_RX_FAIL_GO_TO_SEARCH -> host expected messages to arrive, but
    // client (910XT) has closed the channel, fallback for host is to return to search mode again
    // I suppose that when authentication succeeds and we enter transport layer state, the client will step up its game and provide continous stream of data
    // ANT-FS Technical specification p. 40 s. 9.1 Beacon "Client beacon rates will be application dependent. A trade off is made between power and latecy"
    parseClientBeacon: function (data, onlyDataPayload) {

        // if onlyDataPayload === true, SYNC MSG. LENGTH MSG ID CHANNEL NR is stripped off beacon -> used when assembling burst transfer that contain a beacon in the first packet
        var substractIndex, self = this; // Used to get the adjust index in the data

        if (typeof onlyDataPayload === "undefined")
            substractIndex = 0;
        else if (onlyDataPayload)
            substractIndex = 4;

        var
            beaconInfo = {
                status1: data[5 - substractIndex],
                status2: data[6 - substractIndex],
                authenticationType: data[7 - substractIndex],
            };

        beaconInfo.dataAvailable = beaconInfo.status1 & 0x20 ? true : false; // Bit 5
        beaconInfo.uploadEnabled = beaconInfo.status1 & 0x10 ? true : false; // Bit 4
        beaconInfo.pairingEnabled = beaconInfo.status1 & 0x08 ? true : false; // Bit 3
        beaconInfo.beaconChannelPeriod = beaconInfo.status1 & 0x7;// Bit 2-0

        beaconInfo.clientDeviceState = beaconInfo.status2 & 0x0F; // Bit 3-0 (0100-1111 reserved), bit 7-4 reserved

        if (beaconInfo.clientDeviceState === DeviceProfile_ANTFS.prototype.STATE.AUTHENTICATION_LAYER || beaconInfo.clientDeviceState === DeviceProfile_ANTFS.prototype.STATE.TRANSPORT_LAYER || beaconInfo.clientDeviceState === DeviceProfile_ANTFS.prototype.STATE.BUSY) {
            beaconInfo.hostSerialNumber = data.readUInt32LE(8 - substractIndex);
        }
        else if (beaconInfo.clientDeviceState === DeviceProfile_ANTFS.prototype.STATE.LINK_LAYER) {
            beaconInfo.deviceType = data.readUInt16LE(8 - substractIndex);
            beaconInfo.manufacturerID = data.readUInt16LE(10 - substractIndex);
        }

        function parseStatus1() {
            var status1Str;

            status1Str = "ANT-FS Beacon ";

            if (beaconInfo.dataAvailable)
                status1Str += "+Data ";
            else
                status1Str += "-Data. ";

            if (beaconInfo.uploadEnabled)
                status1Str += "+Upload ";
            else
                status1Str += "-Upload ";

            if (beaconInfo.pairingEnabled)
                status1Str += "+Pairing ";
            else
                status1Str += "-Pairing ";

            status1Str += "(" + beaconInfo.status1 + ") " + DeviceProfile_ANTFS.prototype.BEACON_CHANNEL_PERIOD[beaconInfo.beaconChannelPeriod];

            return status1Str;

        }

        beaconInfo.toString = function () {
            var str,
                INTERNAL_CLOCK_RATE = 32768; // 32.768 kHz internal clock, extended message info. RX_Timestamp rolls over each 2 seconds

            if (beaconInfo.clientDeviceState === DeviceProfile_ANTFS.prototype.STATE.LINK_LAYER) {
                str = parseStatus1() + " " + DeviceProfile_ANTFS.prototype.STATE[beaconInfo.status2 & 0x0F] + " Device type " + beaconInfo.deviceType + " Manuf. ID " + beaconInfo.manufacturerID + " " + DeviceProfile_ANTFS.prototype.AUTHENTICATION_TYPE[beaconInfo.authenticationType];
            }
            else 
                str =  parseStatus1() + " " + DeviceProfile_ANTFS.prototype.STATE[beaconInfo.status2 & 0x0F] + " Host SN. " + beaconInfo.hostSerialNumber + " " + DeviceProfile_ANTFS.prototype.AUTHENTICATION_TYPE[beaconInfo.authenticationType];


            if (typeof self.channelID !== "undefined")
                str += " " + self.channelID.toString();

            if (typeof self.RX_Timestamp !== "undefined")
                str += " RX timestamp " + self.RX_Timestamp + " = " + (self.RX_Timestamp / (INTERNAL_CLOCK_RATE/1000)).toFixed(1) + " ms";

            if (typeof self.RX_Timestamp_Difference !== "undefined")
                str += " previous RX timestamp difference " + (self.RX_Timestamp_Difference / (INTERNAL_CLOCK_RATE/1000)).toFixed(1) + " ms";

            return str;
        };

        
        return beaconInfo;
    },

    sendLinkCommand: function (errorCallback, successCallback) {
        //console.log("LINK", this); this = channelConfiguration
        var channelNr = this.number, self = this;
        var linkMsg = this.deviceProfile.ANTFSCOMMAND_Link(ANT.prototype.ANTFS_FREQUENCY, DeviceProfile_ANTFS.prototype.BEACON_CHANNEL_PERIOD.Hz8, this.nodeInstance.ANT.serialNumber);
        this.nodeInstance.ANT.sendAcknowledgedData(channelNr, linkMsg, errorCallback, successCallback);
    },

    sendDisconnect: function (errorCallback, successCallback) {
        var channelNr = this.number, self = this;
        var disconnectMsg = this.deviceProfile.ANTFSCOMMAND_Disconnect(DeviceProfile_ANTFS.prototype.DISCONNECT_COMMAND.RETURN_TO_LINK_LAYER, 0x00, 0x00);
        this.nodeInstance.ANT.sendAcknowledgedData(channelNr, disconnectMsg, errorCallback,
            function () {
                // For FR 910XT -> only 1 or 2 LINK messages are received after disconnect before device channel is closed
                // To prevent LINK command being sent, its possible to set a flag to indicate that we don't want to do any
                // connection to the device in 10 seconds.
                console.log(Date.now() + " Disconnect ackowledged by device. Earliest reconnection will take place in about 10 seconds.");
                self.deviceProfile.DONT_CONNECT = true;
                setTimeout(function () {
                    delete self.deviceProfile.DONT_CONNECT;
                }, 10000);
                successCallback();
            });
    },

    // Sending this command -> gives a burst of 4 packets 9 bytes in length (including CS/CRC); auth. beacon + 0x84 authenticate response + authorization string on the FR 910XT
    //1368702944969 Rx:  <Buffer a4 09 50 01 43 04 01 03 96 99 27 00 91> * NO parser specified *
    //1368702944972 Rx:  <Buffer a4 09 50 21 44 84 00 10 30 67 0b e5 b5> * NO parser specified *
    //1368702944975 Rx:  <Buffer a4 09 50 41 46 6f 72 65 72 75 6e 6e 85> * NO parser specified *
    //1368702944983 Rx:  <Buffer a4 09 50 e1 65 72 20 39 31 30 58 54 1f> * NO parser specified *
    sendRequestForClientDeviceSerialNumber: function (errorCB, successCB, authenticationResponseCB) {
        var channelNr = this.number, self = this;
        var authMsg = this.deviceProfile.ANTFSCOMMAND_Authentication(DeviceProfile_ANTFS.prototype.AUTHENTICATE_COMMAND.REQUEST_CLIENT_DEVICE_SERIAL_NUMBER, 0, this.nodeInstance.ANT.serialNumber);
        // It's OK to send it as an acknowledgedData if authentication string length is 0, otherwise a burst must be used

        self.deviceProfile.request = {
            timestamp: Date.now(),
            request: 'authenticate_client_device_serial_number',
            callback: authenticationResponseCB, // When authentication response is received as a burst
        };

        this.nodeInstance.ANT.sendAcknowledgedData(channelNr, authMsg,
            function error(err) {
                console.log(Date.now() + " Could not send request for client device serial number", error);
                errorCB(err);

            },
            function success() {
                console.log(Date.now() + " Request for client device serial number acknowledged by device.");
                if (typeof successCB === "function")
                    successCB();
                else
                    console.warn(Date.now() + " No callback specified after send request for client device serial number");
            });
    },

    // Pairing request sent to client device, if friendlyname is provided its sent as a bulk data request otherwise acknowledged
    sendRequestForPairing: function (friendlyName, errorCB, successCB) {
        var channelNr = this.number, self = this, authStringLength = 0, authenticationString;

        if (typeof friendlyName === "undefined")
            console.warn("No friendly name of ANT-FS host specified - will be unknown during pairing");
        else {
            authStringLength = friendlyName.length;
            authenticationString = new Buffer(friendlyName, "utf8");
        }

        var authMsg = this.deviceProfile.ANTFSCOMMAND_Authentication(DeviceProfile_ANTFS.prototype.AUTHENTICATE_COMMAND.REQUEST_PAIRING, authStringLength, this.nodeInstance.ANT.serialNumber);

        // Observation : client will signal state BUSY and pop up user dialog for "Pair with unknown - Yes/No". If yes then client enter transport state. If no,
        // client closes channel -> we get EVENT_RX_FAIL ... EVENT_RX_FAIL_GO_TO_SEARCH
        if (authStringLength === 0) {
            // It's OK to send it as an acknowledgedData if authentication string length is 0, otherwise a burst must be used
            this.nodeInstance.ANT.sendAcknowledgedData(channelNr, authMsg,
                function error() {
                    console.log(Date.now() + " Could not send acknowledged message request for pairing for unknown ANT-FS host ");
                    errorCB();
                },
                function success() {
                    console.log(Date.now() + " Request for pairing sent as acknowledged message for unknown ANT-FS host.");
                    successCB();
                });
        } else {
            var data = Buffer.concat([authMsg.buffer, authenticationString]);
            this.nodeInstance.ANT.sendBurstTransfer(channelNr, data, function error(err) {
                console.log(Date.now() + " Failed to send burst transfer with request for pairing", err);
            },
                function success() { console.log(Date.now() + " Sent burst transfer with request for pairing", data); }, "Pairing request");
        }
    },

    sendRequestWithPasskey: function (passkey, errorCB, successCB) {
        var authStringLength, authMsg, data, authenticationString, channelNr = this.number, self = this;

        if (typeof passkey === "undefined") {
            console.warn(Date.now() + " No passkey specified");
            return;
        }
        else {
            authStringLength = passkey.length;
            authenticationString = passkey;
        }

        authMsg = this.deviceProfile.ANTFSCOMMAND_Authentication(DeviceProfile_ANTFS.prototype.AUTHENTICATE_COMMAND.REQUEST_PASSKEY_EXCHANGE, authStringLength, this.nodeInstance.ANT.serialNumber);

        data = Buffer.concat([authMsg.buffer, authenticationString]);
        this.nodeInstance.ANT.sendBurstTransfer(channelNr, data, function error(err) { console.log(Date.now() + " Failed to send burst transfer with passkey", err); errorCB(error); },
            function success() { console.log(Date.now() + " Sent burst transfer with passkey", data); successCB(); }, "Transfer with passkey");
    },

    // Parses ANT-FS directory at reserved file index 0
    parseDirectory: function (data) {
        var self = this, numberOfFiles, fileNr, file, structureLength, addIndex, totalBytesInDirectory = 0;

        self.deviceProfile.directory = {
            header: {
                version: {
                    major: data[0] & 0xF0,
                    minor: data[0] & 0xF0
                },
                structureLength: data[1],
                timeFormat: data[2],
                //reserved -5 bytes pad 0
                currentSystemTime: data.readUInt32LE(8),
                directoryLastModifiedDateTime: data.readUInt32LE(12),
            },
            index: [],
            newIndex: [], // Index of new files
            downloadIndex: [], //Index of readable/downloadable files
            eraseIndex: [] // Index of erasable files
        };

        structureLength = self.deviceProfile.directory.header.structureLength;
        numberOfFiles = (data.length - 2 * 8) / structureLength;

        console.log("Number of files in directory", numberOfFiles);

        function getDataSubTypeFriendly(subtype) {
            var stype;
            switch (subtype) {
                case 1: stype = "Device capabilities"; break;
                case 2: stype = "Settings"; break;
                case 3: stype = "Sport settings"; break;
                case 4: stype = "Activity"; break;
                case 5: stype = "Workout"; break;
                case 6: stype = "Course"; break;
                case 7: stype = "Schedules"; break;
                case 8: stype = "Locations"; break;
                case 9: stype = "Weight"; break;
                case 10: stype = "Totals"; break;
                case 11: stype = "Goals"; break;
                case 14: stype = "Blood Pressure"; break;
                case 15: stype = "Monitoring"; break;
                case 20: stype = "Activity Summary"; break;
                case 28: stype = "Daily Monitoring"; break;
                default: stype = subtype.toString(); break;
            }
            return stype;
        }

        function getDateAsString(date, useFormatting) {
            var dateStr;

            function formatDate(fDate) {
                var dateAsString = fDate.toISOString();
                // Remove millisec.
                // ISO : 1989-12-31T00:00:00.000Z
                dateAsString = dateAsString.substring(0, dateAsString.length - 5);
                dateAsString = dateAsString.replace(new RegExp(":", "g"), "-");
                //dateAsString = dateAsString.replace("T", "-");
                return dateAsString;
            }

            if (date === 0xFFFFFFFF || date === 0x00)
                dateStr = "UnknownDate" + '-' + date + '-' + Date.now().toString();
            else if (date < 0x0FFFFFFF)
                dateStr = "System-Custom " + date;
            else 
                if (useFormatting)
                    dateStr = formatDate(new Date(Date.UTC(1989, 11, 31, 0, 0, 0, 0) + date * 1000));
                else
                    dateStr = (new Date(Date.UTC(1989, 11, 31, 0, 0, 0, 0) + date * 1000)).toString();

            return dateStr;
        }

        function FileOnDevice(fdata,faddIndex) {
            this.buffer = fdata.slice(16 + faddIndex, 16 + faddIndex + structureLength);
            this.index = fdata.readUInt16LE(16 + faddIndex);
            this.dataType = fdata[18 + faddIndex];
            this.identifier = fdata.readUInt32LE(19 + faddIndex) & 0x00FFFFFF;
            this.dataTypeFlags = fdata[22 + faddIndex];
            this.generalFlags = {
                read: fdata[23 + faddIndex] & 0x80 ? true : false,
                write: fdata[23 + faddIndex] & 0x40 ? true : false,
                erase: fdata[23 + faddIndex] & 0x20 ? true : false,
                archive: fdata[23 + faddIndex] & 0x10 ? true : false,
                append: fdata[23 + faddIndex] & 0x08 ? true : false,
                crypto: fdata[23 + faddIndex] & 0x04 ? true : false,
                //reserved bit 0-1
            };
            this.size = fdata.readUInt32LE(24 + faddIndex);
            this.date = fdata.readUInt32LE(28 + faddIndex);

            if (this.dataType === DeviceProfile_ANTFS.prototype.FILE_TYPE.FIT) {
                this.dataTypeFriendly = 'FIT';
                this.dataSubType = fdata[19 + faddIndex];
                this.dataSubTypeFriendly = getDataSubTypeFriendly(fdata[19 + faddIndex]);
                this.number = fdata.readUInt16LE(20 + faddIndex);
            } else
                this.dataTypeFriendly = 'Datatype-' + this.dataType.toString();

            this.fileName = this.getFileName();
        }

        FileOnDevice.prototype.getFileName = function () {
            if (this.dataType === DeviceProfile_ANTFS.prototype.FILE_TYPE.FIT)
                return  this.dataTypeFriendly + "-" + this.dataSubTypeFriendly + "-" + this.index + "-" + getDateAsString(this.date, true) + ".FIT";
            else
                return this.dataTypeFriendly + "-" + getDateAsString(this.date) + "-" + this.index + ".BIN"; 
        }

        FileOnDevice.prototype.toString = function () {
            var generalFlags = "", dataType = this.dataType, date = "", number = "", dataTypeFlags = "",
                dataSubType = "";

            // Date is number of sec. elapsed since 00:00 of Dec. 31, 1989

            //if (this.date === 0xFFFFFFFF || this.date === 0x00)
            //    date = "Unknown";
            //else if (this.date < 0x0FFFFFFF)
            //    date = "System/Custom " + this.date;
            //else if (this.date !== 0)
            //    date = new Date(Date.UTC(1989, 11, 31, 0, 0, 0, 0) + this.date * 1000);

            date = getDateAsString(this.date);

            if (this.generalFlags.read)
                generalFlags += "download";

            if (this.generalFlags.write)
                generalFlags += '_upload';

            if (this.generalFlags.erase)
                generalFlags += '_erase';

            if (this.generalFlags.archive)
                generalFlags += '_archive';

            if (!this.generalFlags.archive)
                generalFlags += '_NEW';

            if (this.generalFlags.append)
                generalFlags += '_append';

            if (this.generalFlags.crypto)
                generalFlags += '_crypto';

            if (this.dataTypeFlags !== 0x00)
                dataTypeFlags = this.dataTypeFlags;

            if (this.dataType <= 0x0F)
                dataType += " Manufacturer/Device";

            if (this.dataType === DeviceProfile_ANTFS.prototype.FILE_TYPE.FIT) {

                if (this.number !== 0xFFFF)
                    number = this.dataSubType;

                // FIT Files Types document in the FIT SDK 
                dataSubType = getDataSubTypeFriendly(this.dataSubType);

                // Number skipped (seems to be the same as dataSubTupe) for FR 910XT
                dataType += " " + this.dataTypeFriendly + " " + dataSubType;
            }
            // (Skip this.identifier in output->not useful)
            return  "Index " + this.index + " " + dataType + " " + dataTypeFlags + " " + generalFlags + " " + this.size + " " + date; 
        }

        for (fileNr = 0; fileNr < numberOfFiles; fileNr++) {

            addIndex = fileNr * structureLength;

            //file = {
            //    buffer: data.slice(16 + addIndex, 16 + addIndex + structureLength),
            //    index: data.readUInt16LE(16 + addIndex),
            //    dataType: data[18 + addIndex],
            //    identifier: data.readUInt32LE(19 + addIndex) & 0x00FFFFFF,
            //    dataTypeFlags: data[22 + addIndex],
            //    generalFlags: {
            //        read: data[23 + addIndex] & 0x80 ? true : false,
            //        write: data[23 + addIndex] & 0x40 ? true : false,
            //        erase: data[23 + addIndex] & 0x20 ? true : false,
            //        archive: data[23 + addIndex] & 0x10 ? true : false,
            //        append: data[23 + addIndex] & 0x08 ? true : false,
            //        crypto: data[23 + addIndex] & 0x04 ? true : false,
            //        //reserved bit 0-1
            //    },
            //    size: data.readUInt32LE(24 + addIndex),
            //    date: data.readUInt32LE(28 + addIndex)
            //};

            file = new FileOnDevice(data, addIndex);

            // Update index for new,downloadable,erasable files
            if (!file.generalFlags.archive)
                self.deviceProfile.directory.newIndex.push(file.index); // Keeps the index new files

            if (file.generalFlags.read)
                self.deviceProfile.directory.downloadIndex.push(file.index);

            if (file.generalFlags.erase)
                self.deviceProfile.directory.eraseIndex.push(file.index);

            totalBytesInDirectory += file.size;

            // console.log(file);
            self.deviceProfile.directory.index[file.index] = file;

            console.log(file.toString());

        }

        console.log("Total bytes in directory : ", totalBytesInDirectory);

        if (self.deviceProfile.directory.newIndex.length > 0)
            console.log("New files : ", self.deviceProfile.directory.newIndex.length);
        else
            console.log("All files archived/previously downloaded");

        if (self.deviceProfile.directory.downloadIndex.length > 0)
            console.log("Downloadable/readable files : ", self.deviceProfile.directory.downloadIndex.length);
        else
            console.log("No downloadable/readable files available");

        if (self.deviceProfile.directory.eraseIndex.length > 0)
            console.log("Erasable files : ", self.deviceProfile.directory.eraseIndex.length);
        else
            console.log("No erasable files in directory");

        //console.log(self.deviceProfile.directory);
    },

    sendDownloadRequest: function (dataIndex, dataOffset, initialRequest, CRCSeed, maximumBlockSize, downloadFinishedCB) {
        var downloadMsg, channelNr = this.number, self = this;
        //dataParser = parser;

        //if (dataIndex === 0x00) // For directory choose default parser
        //     dataParser = self.nodeInstance.deviceProfile_ANTFS.parseDirectory;

        if (initialRequest === DeviceProfile_ANTFS.prototype.INITIAL_DOWNLOAD_REQUEST.NEW_TRANSFER) {
            if (typeof downloadFinishedCB === "undefined")
                console.warn(Date.now(),"No callback specified for further processing after download");

            self.deviceProfile.request = {
                timestamp: Date.now(),
                preferredTransferType: DeviceProfile_ANTFS.prototype.REQUEST_TRANSFER_TYPE.BURST,
                request: DeviceProfile_ANTFS.prototype.REQUEST_TYPE.DOWNLOAD,
                dataIndex: dataIndex,
                initialRequest: initialRequest,
                //parser: dataParser,
                callback: downloadFinishedCB, // When download is finished
            };
        } else {
            self.deviceProfile.request.dataOffset = dataOffset;
            self.deviceProfile.request.CRCSeed = CRCSeed;
            self.deviceProfile.request.maximumBlockSize = maximumBlockSize;
            self.deviceProfile.request.initialRequest = initialRequest;
            
        }

        // console.log(Date.now() + "dataIndex:", dataIndex, "offset:", dataOffset, "initreq.:", initialRequest, "crcseed:", CRCSeed, "maxblocksize:", maximumBlockSize);

        downloadMsg = self.deviceProfile.ANTFSCOMMAND_Download(dataIndex, dataOffset, initialRequest, CRCSeed, maximumBlockSize);

        self.deviceProfile.request.rawMessage = downloadMsg;
        self.deviceProfile.request.state = DeviceProfile_ANTFS.prototype.REQUEST_STATE.REQUEST;

        function retry() {
            // Delay should be higher than the channel period which is 125 ms, so that we can get client device state in beacon broadcast (only want to
            // send request when client is in TRANSPORT state)
            if (self.deviceProfile.lastBeacon.beacon.clientDeviceState === DeviceProfile_ANTFS.prototype.STATE.BUSY) {
                self.deviceProfile.request.state = DeviceProfile_ANTFS.prototype.REQUEST_STATE.BUSY;
                console.log(Date.now() + " Client is busy. Delaying burst of download request with 130 ms");
                setTimeout(function () { retry(); }, 130);
            }
            else
                self.nodeInstance.ANT.sendBurstTransfer(channelNr, downloadMsg, function error() {
                    self.deviceProfile.request.state = DeviceProfile_ANTFS.prototype.REQUEST_STATE.ERROR;
                    console.log(Date.now() + " Failed to send burst transfer with download request");
                },
           function success() {
               self.deviceProfile.request.state = DeviceProfile_ANTFS.prototype.REQUEST_STATE.SENT;
               //http://stackoverflow.com/questions/7695450/how-to-program-hex2bin-in-javascript
               function pad(s, z) { s = "" + s; return s.length < z ? pad("0" + s, z) : s };
               console.log(Date.now() + " Sent burst transfer with download request dataIndex: %d dataOffset %d CRC-16 seed %s", dataIndex, dataOffset, pad(CRCSeed.toString(2),16));
           }, "DownloadRequest index: " + dataIndex + " data offset: " + dataOffset + " initial request: " + initialRequest + "CRC seed: " + CRCSeed + "max. block size: " + maximumBlockSize);
        }

        retry();
    },

    sendEraseRequest: function (dataIndex, initRequest, eraseFinishedCB) {
        var eraseMsg, channelNr = this.number, self = this;

        //self.deviceProfile.dataIndex = dataIndex; // Reference to requested dataIndex -> used for continuation of download

        if (initRequest) // if not initRequest its a retry request
            self.deviceProfile.request = {
                timestamp: Date.now(),
                preferredTransferType : DeviceProfile_ANTFS.prototype.REQUEST_TRANSFER_TYPE.ACKNOWLEDGED,
                request: DeviceProfile_ANTFS.prototype.REQUEST_TYPE.ERASE,
                retry: 0,  // Number of retries
                dataIndex: dataIndex,
                callback: eraseFinishedCB, // When we got erase response
            };

        eraseMsg = self.deviceProfile.ANTFSCOMMAND_Erase(dataIndex);

        self.deviceProfile.request.rawMessage = eraseMsg;
        self.deviceProfile.request.state = DeviceProfile_ANTFS.prototype.REQUEST_STATE.REQUEST;

        console.log(self.deviceProfile.request, eraseMsg);

        // MAYBE : Optimize sending of new request when recieving client state = TRANSPORT broadcast instead of using a timeout
        function retryIfBusy() {
            if (self.deviceProfile.lastBeacon.beacon.clientDeviceState === DeviceProfile_ANTFS.prototype.STATE.BUSY) {
                console.log(Date.now() + " Client is busy. Delaying burst of erase request with 130 ms");
                setTimeout(function () { retryIfBusy(); }, 130);
            }
            else
                self.nodeInstance.ANT.sendAcknowledgedData(channelNr, eraseMsg,
                    function error() {
                        self.deviceProfile.request.state = DeviceProfile_ANTFS.prototype.REQUEST_STATE.ERROR;
                        console.log(Date.now() + " Failed to send acknowledged transfer with erase request");
                    },
                   function success() {
                       self.deviceProfile.request.state = DeviceProfile_ANTFS.prototype.REQUEST_STATE.SENT;
                       console.log(Date.now() + " Sent acknowledged transfer with erase request", eraseMsg);
                   }, "EraseRequest index: " + dataIndex);
        }

        retryIfBusy();
    },

    downloadMultipleFiles: function (files, completeCB) {
        var self = this;

        console.log(Date.now() + " Downloading ", files.length, " files.");

        function downloadNextFile() {
            var nextFileIndex = files.shift();
            if (typeof nextFileIndex !== "undefined")
                self.nodeInstance.deviceProfile_ANTFS.sendDownloadRequest.call(self, nextFileIndex, 0,
                    DeviceProfile_ANTFS.prototype.INITIAL_DOWNLOAD_REQUEST.NEW_TRANSFER, 0, 0, function downloadFinishedCB() {
                        downloadNextFile();
                    });
            else
                if (typeof completeCB !== "function")
                    console.warn(Date.now() + " No completion callback specified after download");
                else
                    completeCB();

        }

        downloadNextFile();

    },

    eraseMultipleFiles: function (files, completeCB) {
        var self = this;

        console.log(Date.now() + " Erasing ", files.length, " files.");

        function eraseNextFile() {
            var nextFileIndex;
            if (typeof files === 'object')
                nextFileIndex = files.shift();

            if (typeof nextFileIndex !== "undefined")

                self.nodeInstance.deviceProfile_ANTFS.sendEraseRequest.call(self, nextFileIndex, true, function complete() {
                    eraseNextFile();
                });

            else
                if (typeof completeCB !== "function")
                    console.warn(Date.now() + " No completion callback specified after erase");
                else
                    completeCB();

        }

        eraseNextFile();

    },

    disconnectFromDevice: function (completeCB) {
        var self = this;
        self.nodeInstance.deviceProfile_ANTFS.sendDisconnect.call(self, function error() {
            console.log(Date.now() + " Failed to send ANT-FS disconnect command to device");
            // delete self.deviceProfile.sendingLINK;
        },
                                         function success() {
                                             // delete self.deviceProfile.download;
                                             console.log(Date.now() + " ANT-FS disconnect command acknowledged by device. Device should return immediatly to LINK layer.");

                                             if (typeof completeCB === "function")
                                                 completeCB();
                                             else
                                                 console.warn(Date.now() + " No completion callback specified after disconnect");

                                         }); // Request device return to LINK layer
    },

    // Listener for broadcast event for all channels -> must filter
    // When this function is called from emit function of EventEmitter -> this will be the eventEmitter = ANT instance
    // This can be verified by looking at the code for emit in REPL console : console.log((new (require('events').EventEmitter)).emit.toString()) ->
    // event handler is called using handler.call(this=ANT Instance,...)
    broadCastDataParser: function (data) {
       // Function context -  console.log(this);
        var beaconID = data[4], channelNr = data[3],
            beacon, self = this,
            retryLINK = 0, currentCommand;
        // Check for valid beacon ID 0x43 , p. 45 ANT-FS Technical Spec.

      
        if (channelNr !== self.number) // Only handle channel broadcast for this particular channel (FILTER OUT OTHER CHANNELS)
        {
            console.error(Date.now() + " Received broadcast data for channel ", channelNr, " intended for channel ", self.number);
            return;
        }

        if (typeof self.deviceProfile.DONT_CONNECT !== "undefined")  // Prevent re-connection for 10 seconds after a disconnect command is sent to the device
            return;

        function retryLink() {
            if (++retryLINK < 10) {
                self.nodeInstance.deviceProfile_ANTFS.sendLinkCommand.call(self,
                    function error() {
                        console.log(Date.now() + " Failed to send ANT-FS link command to device");
                        delete self.deviceProfile.sendingLINK; // Release MUTEX

                    },
                    function success() {
                        console.log(Date.now() + " ANT-FS link command acknowledged by device.");
                        // Device should transition to authentication beacon now if all went well
                        setTimeout(function handler() {
                            if (typeof self.deviceProfile.sendingLINK !== "undefined") {
                                console.log(Date.now() + " Device did not transition to authentication state. Retrying when LINK beacon is received from device.");
                                delete self.deviceProfile.sendingLINK;
                                retryLINK = 0;
                            }
                        }, 10000); // Allow resend of LINK after 10 sec.
                    }
                    );
            } else {
                console.error(Date.now() + " Reached maximum number of retries of sending LINK command to device.");
            }
        }

        //if (beaconID !== DeviceProfile_ANTFS.prototype.BEACON_ID)
        //    console.log(Date.now()+" Got a normal broadcast. Awaiting beacon broadcast from device.", data);
        if (beaconID === DeviceProfile_ANTFS.prototype.BEACON_ID) {

            // If we not have updated channel id, then get it

            beacon = self.nodeInstance.deviceProfile_ANTFS.parseClientBeacon.call(self,data);

            self.deviceProfile.lastBeacon = { beacon: beacon, timestamp: Date.now() };

            console.log(Date.now() + " " + beacon.toString());

            clearTimeout(self.deviceProfile.linkLayerTimeout);


            switch (beacon.clientDeviceState) {

                case DeviceProfile_ANTFS.prototype.STATE.BUSY:
                    console.log(Date.now(), beacon.toString());
                    break;

                case DeviceProfile_ANTFS.prototype.STATE.LINK_LAYER:

                    self.deviceProfile.state = DeviceProfile_ANTFS.prototype.STATE.LINK_LAYER; // Follow same state in host as the device/client;
                    // self.deviceProfile.stateCounter[DeviceProfile_ANTFS.prototype.STATE.LINK_LAYER]++;
                    
                    // Reset MUTEX'es 

                    if (typeof self.deviceProfile.sendingAUTH_CLIENT_SN !== "undefined")
                        delete self.deviceProfile.sendingAUTH_CLIENT_SN;

                    if (typeof self.deviceProfile.processingCommand !== "undefined")
                        delete self.deviceProfile.processingCommand;

                    self.deviceProfile.linkLayerTimeout = setTimeout(function () {
                        console.log(Date.now() + " Did not receive any LINK beacon from device in 1 second, connection probably lost/device closed channel");
                    }, 1000);

                    if (beacon.dataAvailable || self.nodeInstance.commandQueue.length > 0) // Only go to auth. layer if new data is available or there is more commands to process
                    {
                        if (self.nodeInstance.commandQueue.length === 0 && beacon.dataAvailable) {
                            console.log(Date.now() + " LINK beacon reports data available, scheduling download of new files");
                            self.nodeInstance.commandQueue.push(DeviceProfile_ANTFS.prototype.NODECOMMAND.DOWNLOAD_NEW);
                        }

                        switch (beacon.authenticationType) {

                            case DeviceProfile_ANTFS.prototype.AUTHENTICATION_TYPE.PASSKEY_AND_PAIRING_ONLY:

                                // Do not enter this region more than once (can reach 8 beacon msg. pr sec === channel period) -> MUTEX self.deviceProfile.sendingLINK
                                if (typeof self.deviceProfile.sendingLINK === "undefined") {
                                    self.deviceProfile.sendingLINK = true;
                                    retryLink();
                                }

                                break;

                            default:
                                console.error("Authentication type not implemented, cannot proceed to transport layer ", DeviceProfile_ANTFS.prototype.AUTHENTICATION_TYPE[beacon.authentication], "(" + beacon.authentication + ")");
                                break;
                        }
                    }

                    break;

                case DeviceProfile_ANTFS.prototype.STATE.AUTHENTICATION_LAYER:
                    // One exception is EVENT_TRANSFER_TX_FAILED of link command (but device got the command and still sends AUTHENTICATION BEACON)  
                    self.deviceProfile.state = DeviceProfile_ANTFS.prototype.STATE.AUTHENTICATION_LAYER;// Follow same state in host as the device/client;

                    delete self.deviceProfile.sendingLINK;

                    // Is authentication beacon for us?

                    if (beacon.hostSerialNumber !== self.nodeInstance.ANT.serialNumber)
                        console.warn("Authentication beacon was for ", beacon.hostSerialNumber, ", our device serial number is ", self.nodeInstance.ANT.serialNumber);
                    else
                        if (typeof self.deviceProfile.sendingAUTH_CLIENT_SN === "undefined") // MUTEX
                        {
                            self.deviceProfile.sendingAUTH_CLIENT_SN = true;
                            // Observation: client device will transmit AUTHENTICATION beacon for 10 seconds after receiving this request
                            self.nodeInstance.deviceProfile_ANTFS.sendRequestForClientDeviceSerialNumber.call(self, function error(err) {
                                delete self.deviceProfile.sendingAUTH_CLIENT_SN; // Allow resend
                            }, function success() {
                                // Device will send a authentication burst response after a short while after receiving the authentication request
                            },

                            // Callback from parseBurstData when authentication response is received from the device
                            function authenticationCB() {
                                // Try to read passkey from file
                                var passkeyFileName = self.deviceProfile.getHomeDirectory() + '\\passkey.BIN';
                                console.log(Date.now() + " Trying to find passkey file at ", passkeyFileName);
                                fs.exists(passkeyFileName, function (exists) {
                                    if (exists) {
                                        console.log(Date.now() + " Found passkey.bin file");
                                        fs.readFile(passkeyFileName, function (err, data) {
                                            if (err) throw err;
                                            self.deviceProfile.passkey = data;
                                            //console.log(data);
                                            self.nodeInstance.deviceProfile_ANTFS.sendRequestWithPasskey.call(self, data, function error(err) {
                                                delete self.deviceProfile.sendingAUTH_CLIENT_SN;
                                            }, function success() {
                                            });
                                        });
                                    }
                                    else {
                                        console.log(Date.now() + " Did not find passkey.bin file, requesting pairing with device");
                                        self.nodeInstance.deviceProfile_ANTFS.sendRequestForPairing.call(self, DeviceProfile_ANTFS.prototype.FRIENDLY_NAME, function error(err) {
                                            delete self.deviceProfile.sendingAUTH_CLIENT_SN;
                                        }, function success() {

                                        });
                                    }
                                });
                            });
                            //else
                            //    console.log("SKIPPING AUTH BEACON, waiting for request for client device serial number");
                        }

                    break;

                case DeviceProfile_ANTFS.prototype.STATE.TRANSPORT_LAYER:

                    //console.log(Date.now() + "Request:", self.deviceProfile.request);

                    self.deviceProfile.state = DeviceProfile_ANTFS.prototype.STATE.TRANSPORT_LAYER;
                    delete self.deviceProfile.sendingAUTH_CLIENT_SN;
                    // If no transmission takes place on the established link, client will close channel in 10 seconds and return to LINK state.
                    // p. 56 in ANT-FS spec. PING-command 0x05 can be sent to keep alive link to reset client device connection timer

                    if (typeof self.deviceProfile.processingCommand === "undefined") // MUTEX
                    { // Can only process one command at a time
                        self.deviceProfile.processingCommand = true;

                        console.log("COMMAND QUEUE:", self.nodeInstance.commandQueue);
                        currentCommand = self.nodeInstance.commandQueue.shift(); // Take next command

                        if (typeof currentCommand === "undefined") {
                            console.warn(Date.now() + " No commands available for further processing");
                            self.nodeInstance.deviceProfile_ANTFS.disconnectFromDevice.call(self, function complete() {
                                delete self.deviceProfile.processingCommand;
                            });
                            
                            // Won't allow more processing in transport layer now, client device will return to LINK layer
                        }
                        else
                            switch (currentCommand) {

                                case DeviceProfile_ANTFS.prototype.NODECOMMAND.DOWNLOAD_NEW:
                                case DeviceProfile_ANTFS.prototype.NODECOMMAND.DOWNLOAD_ALL:
                                case DeviceProfile_ANTFS.prototype.NODECOMMAND.DOWNLOAD_MULTIPLE:

                                    self.nodeInstance.deviceProfile_ANTFS.sendDownloadRequest.call(self,
                                            DeviceProfile_ANTFS.prototype.RESERVED_FILE_INDEX.DIRECTORY_STRUCTURE, 0,
                                            DeviceProfile_ANTFS.prototype.INITIAL_DOWNLOAD_REQUEST.NEW_TRANSFER, 0, 0,
                                            function completeCB() {
                                                // var self = this;
                                                var genericIndex;

                                                self.nodeInstance.deviceProfile_ANTFS.parseDirectory.call(self, self.deviceProfile.response.downloadFile);

                                                if (currentCommand === DeviceProfile_ANTFS.prototype.NODECOMMAND.DOWNLOAD_NEW)
                                                    genericIndex = self.deviceProfile.directory.newIndex;
                                                else if (currentCommand === DeviceProfile_ANTFS.prototype.NODECOMMAND.DOWNLOAD_ALL)
                                                    genericIndex = self.deviceProfile.directory.downloadIndex;
                                                else if (currentCommand === DeviceProfile_ANTFS.prototype.NODECOMMAND.DOWNLOAD_MULTIPLE) {

                                                    genericIndex = self.nodeInstance.commandIndex[0];
                                                   // console.log("genericIndex", genericIndex);
                                                }

                                                if (typeof genericIndex !== "undefined" && genericIndex.length > 0) {
                                                    self.deviceProfile.downloadMultipleFiles.call(self, genericIndex, function complete() {
                                                        //console.log(Date.now() + " Downloaded new files");
                                                        delete self.deviceProfile.processingCommand; // Allow processing of next command
                                                    });

                                                } else {
                                                    //console.log(Date.now() + " No files downloaded");
                                                    delete self.deviceProfile.processingCommand; // Allow processing of next command
                                                }
                                            });

                                    break;

                                case DeviceProfile_ANTFS.prototype.NODECOMMAND.ERASE_MULTIPLE:

                                    var genericIndex;

                                    genericIndex = self.nodeInstance.commandIndex[0];

                                    if (genericIndex.length > 0) {
                                        // Index position only valid for one request -> erase of one file updates index of other files -> not easy to delete multiple files in one operation -> only delete ONE file pr. operation
                                        self.deviceProfile.eraseMultipleFiles.call(self, [genericIndex[0]], function complete() {
                                            self.nodeInstance.deviceProfile_ANTFS.sendDownloadRequest.call(self,
                                           DeviceProfile_ANTFS.prototype.RESERVED_FILE_INDEX.DIRECTORY_STRUCTURE, 0,
                                           DeviceProfile_ANTFS.prototype.INITIAL_DOWNLOAD_REQUEST.NEW_TRANSFER, 0, 0,
                                           function completeCB() {
                                               // var self = this;

                                               self.nodeInstance.deviceProfile_ANTFS.parseDirectory.call(self, self.deviceProfile.response.downloadFile);

                                               delete self.deviceProfile.processingCommand;
                                           });
                                        });
                                    } else {
                                        console.log(Date.now() + " No files to erase");
                                        delete self.deviceProfile.processingCommand; // Allow processing of next command
                                    }

                                    break;

                                default:
                                    console.log(Date.now() + " Unknown command to process " + self.nodeInstance.commandQueue);
                                    delete self.deviceProfile.processingCommand;
                                    break;
                            }
                    }
                    //else
                    //    console.log(Date.now() + " Nothing to do in transport layer ", self.deviceProfile.download);

                    break;
            }
        }
    }
};

module.exports = DeviceProfile_ANTFS;