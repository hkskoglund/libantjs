/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true */


/*jshint -W097 */
'use strict';

var EventEmitter = require('events'),
  ClientBeacon = require('./clientBeacon'),

  DownloadRequest = require('../request-response/downloadRequest'),
  DownloadResponse = require('../request-response/downloadResponse'),

  EraseRequest = require('../request-response/eraseRequest'),
  EraseResponse = require('../request-response/eraseResponse'),

  CRC = require('./util/crc'),
  crc = new CRC(),

  State = require('./util/state'),

  Directory = require('../file/directory'),

  fs = require('fs');

// heap = require('/usr/lib/node_modules/heapdump');

function TransportManager(host) {

  EventEmitter.call(this);

  this.host = host;

  this.log = this.host.log;
  this.logger = this.host.log.log.bind(this.host.log);

  this.host.on('EVENT_RX_FAIL_GO_TO_SEARCH', this.onReset.bind(this));
  this.host.on('beacon', this.onBeacon.bind(this));
  this.host.on('burst', this.onBurst.bind(this));


  this.host.on('download', this.onDownload.bind(this));
  this.host.on('download_progress', this.onDownloadProgress.bind(this));


  this.once('transport', this.onTransport);

  this.directory = new Directory(undefined, host);

  this.downloadIndex = [0]; // Always download directory
  this.eraseIndex = [];

}

TransportManager.prototype = Object.create(EventEmitter.prototype);
TransportManager.prototype.constructor = TransportManager;

TransportManager.prototype.DOWNLOAD_PROGRESS_UPDATE = 1000;

TransportManager.prototype.onReset = function() {
  this.removeAllListeners();
  this.once('transport', this.onTransport);
  this.directory = new Directory(undefined, this.host);
};

TransportManager.prototype.onBeacon = function(beacon) {

  if (beacon.clientDeviceState.isTransport() && beacon.forHost(this.host.getHostSerialNumber()) &&
    this.host.state.isAuthentication()) {
    this.emit('transport');
  }
};

TransportManager.prototype.onBurst = function(burst) {

  var responseData,
    responseId;


  if (!(this.host.beacon.forHost(this.host.hostSerialNumber) &&
      this.host.state.isTransport()))
    return;

  //clearTimeout(this.commandResponseTimeout);

  responseData = burst.subarray(ClientBeacon.prototype.PAYLOAD_LENGTH);
  responseId = responseData[1]; // Spec sec. 12 ANT-FS Host Command/Response

  switch (responseId) {

    case DownloadResponse.prototype.ID:

      this.handleDownloadResponse(responseData);

      break;

   case EraseResponse.prototype.ID:

      this.handleEraseResponse(responseData);

      break;

  }
};

TransportManager.prototype.handleEraseResponse = function(responseData) {
  var response,
    NO_ERROR,
    lastIndex;

  response = new EraseResponse(responseData);

  this.session.response.push(response);

  if (this.log.logging)
    this.logger('log', response.toString());

    switch (response.result) {

      case EraseResponse.prototype.OK:

        lastIndex = this.session.request[this.session.request.length-1].index;
        this.directory.eraseFile(lastIndex);

        this.emit('erase', NO_ERROR, this.session);

        break;

      default:

        this.emit('erase', response, this.session);
      }
    };

TransportManager.prototype.handleDownloadResponse = function(responseData) {
  var response,
    appendArray,
    offset,
    NO_ERROR,
    now;

  response = new DownloadResponse(responseData);

  this.session.response.push(response);

  if (this.log.logging)
    this.logger('log', response.toString());

  switch (response.result) {

    case DownloadResponse.prototype.OK:

      if (response.offset === 0) {

        this.session.packets = new Uint8Array(response.fileSize);

        if (this.session.request[0].maxBlockSize === 0) // Infer client block length
          this.session.maxBlockSize = response.length;

      }

      // May happend if client appends to a file during download (rare case?)
      // Spec. 9.5 "Host devices must be able to adapt to files being larger than listed in the directory"

      if (response.fileSize > this.session.packets.byteLength) {

        if (this.log.logging)
          this.logger('warn', 'Client has increased file size to ' + response.fileSize + ' bytes from ' + this.session.packets.byteLength);

        appendArray = new Uint8Array(response.fileSize);
        appendArray.set(this.session.packets);
        this.session.packets = appendArray;
      }

      this.session.packets.set(response.packets, response.offset);
      response.packets = null; // Don't cache in session

      offset = response.offset + response.length;

      now = Date.now();

      if (response.offset === 0 ||
        (this.session.timestamp && (now - this.session.timestamp) >= TransportManager.prototype.DOWNLOAD_PROGRESS_UPDATE) ||
        offset >= response.fileSize)
        {
           this.session.timestamp = now;

           this.session.offset = offset;

           this.session.progress = this.session.offset /  response.fileSize * 100;

           this.host.emit('download_progress', NO_ERROR, this.session);
        }

      if (offset < response.fileSize) {

        this.download(this.session.index, offset);
      } else
       {

         if (this.session.index === 0)
         {
           this.directory = new Directory(this.session.packets, this.host);
           this.session.filename = this.directory.getFileName();
           this.host.emit('directory', this.directory.ls(this.session.maxBlockSize));
         } else
         {
           this.session.filename = this.directory.getFile(this.session.index).getFileName();
         }


         this.host.emit('download', NO_ERROR, this.session);
       }

      break;

    default: // does not exist, exists not downloadable, not ready to download, request invalid, crc incorrect

      this.host.emit('download', response, this.session);

      break;

  }

};

TransportManager.prototype.onRequestSent = function(err, msg) {
  if (err && this.log.logging)
    this.log.log('error', 'Failed to send request to client (EVENT_TRANSFER_TX_FAILED)', err);
};


TransportManager.prototype.sendRequest = function(request) {

  this.session.request.push(request);

  this.host.sendBurst(request, this.onRequestSent.bind(this));
};

TransportManager.prototype.download = function(index, offset) {
  var request,
    crcSeed;

  if (typeof offset === 'function') {

    this.session = {
      index : index,
      request: [],
      response: [],
    };

    request = new DownloadRequest(index);
    // TEST  request.setMaxBlockSize(8);

    this.host.once('download', offset);

  } else {

    request = new DownloadRequest();

    // "The seed value should equal the CRC value of the data received prior to the requested data offset" Spec. section 12.7.1

    crcSeed = crc.calc16(this.session.packets.subarray(0, offset));

    request.continueRequest(index, offset, crcSeed, this.session.request[0].maxBlockSize);
  }

  this.sendRequest(request);
};

TransportManager.prototype.erase = function (index, callback)
{
  var request;

  this.session = {
    index : index,
    request: [],
    response: [],
  };

  request = new EraseRequest(index);
  this.once('erase', callback);

  this.sendRequest(request);
};

TransportManager.prototype.concatIndex = function(commandType, indexArray) {
  this[commandType + 'Index'] = this[commandType + 'Index'].concat(indexArray);

  if (this.log.logging)
    this.log.log('log', commandType.toUpperCase() + ' request for index ', indexArray);

};

TransportManager.prototype.concatDownloadIndex = function(indexArray) {
  this.concatIndex('download', indexArray);
};

TransportManager.prototype.concatEraseIndex = function(indexArray) {
  this.concatIndex('erase', indexArray);
};

TransportManager.prototype.onTransport = function() {

  var index = -1;
  var onNextDownloadIndex = function _onNextDownloadIndex(err, session) {

    if (!err && session)
    {
      if (this.log.logging)
        this.log.log('log','Downloaded '+ session.filename + ' (' + session.packets.byteLength + ' bytes)');

    }

    index++;

    if (index === 1) {// First iteration downloads directory at index 0
     this.concatDownloadIndex(this.directory.getNewFITfiles());
    }

    if (err)
    {
      if (this.log.logging)
        this.log.log('log','Failed to download file at index ' + this.downloadIndex[index - 1] + ' ' + err.toString());
    }

    if (this.downloadIndex && this.downloadIndex.length && index < this.downloadIndex.length)
      this.download(this.downloadIndex[index], onNextDownloadIndex);


  }.bind(this);


  this.host.state.set(State.prototype.TRANSPORT);

  onNextDownloadIndex();

};

TransportManager.prototype.onDownloadProgress = function (error, session)
{
  if (this.log.logging)
    this.log.log('log','progress ' + Number(session.progress).toFixed(1)+'% ' + session.filename);
};

TransportManager.prototype.onDownload = function(error, session)
{
  if (this.host.host.isNode() && !error && session && session.index)
    fs.writeFile(session.filename, new Buffer(session.packets), function(err) {
      if (err) {
        if (this.log.logging)
          this.log.log('error'," Error writing " + session.filename, err);
      }
      else {
        if (this.log.logging)
          this.log.log('log'," Saved " + session.filename);
      }

    });

};


module.exports = TransportManager;
return module.exports;
