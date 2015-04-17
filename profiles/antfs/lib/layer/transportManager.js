/* global define: true, Uint8Array: true, clearTimeout: true, setTimeout: true, require: true,
module:true, process: true, window: true, clearInterval: true, setInterval: true, DataView: true, Buffer: true */


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

function TransportManager(host, download,erase,ls) {

  EventEmitter.call(this);

  this.host = host;

  this.log = this.host.log;
  this.logger = this.host.log.log.bind(this.host.log);

  this.host.on('reset', this.onReset.bind(this));
  this.host.on('beacon', this.onBeacon.bind(this));
  this.host.on('burst', this.onBurst.bind(this));

  this.host.on('download', this.onDownload.bind(this));
  this.host.on('download_progress', this.onDownloadProgress.bind(this));

  this.host.on('erase', this.onErase.bind(this));

  this.once('transport', this.onTransport);

  this.task = [];
  this.execTaskIndex = -1;
  this.addDownloadTask(0);

  this.addDownloadTask(download);
  this.addEraseTask(erase);

}

TransportManager.prototype = Object.create(EventEmitter.prototype);
TransportManager.prototype.constructor = TransportManager;

TransportManager.prototype.onErase = function (error,session)
{
  var filename = session.file.getFileName();

  if (!error)
    console.log('Erased ' + filename);
  else
   console.log('Failed file erase index ' + session.index + ' ' + error.toString());

};

TransportManager.prototype.addTask = function (request,index)
{
  var split,
      filteredSplit;

  if (typeof index === 'string') //In case '10,11'-format or '10 11'
  {
       split = index.split(/[\s,]+/);
       split.forEach(function (e,i) { split[i] = Number(e); });
       filteredSplit = split.filter(function (e) { return !isNaN(e); });
       //if (this.log.logging)
       // this.log.log('log','Filtered split',filteredSplit);
       this.addTask(request,filteredSplit);
  }

  if (typeof index === 'object' && index.constructor === Array) {// Allow [1,2,3]
    index.forEach(function (i) { this.addTask(request,i);}.bind(this));
    return;
  }

  if (typeof index !== 'number')
    return;

  var task = {
    request: request,
    index: index,
    done : false,
    retry : 0
  };

  if (this.log.logging)
    this.log.log('log','Adding task',task);

  if (request === DownloadRequest.prototype.ID)
    this.task.splice(1,0,task); // Insert at front (erase tasks should follow download tasks)
  else
    this.task.push(task);
};

TransportManager.prototype.addDownloadTask = function(index) {

  this.addTask(DownloadRequest.prototype.ID,index);
};

TransportManager.prototype.addEraseTask = function(index) {

  this.addTask(EraseRequest.prototype.ID,index);
};

TransportManager.prototype.DOWNLOAD_PROGRESS_UPDATE_INTERVAL = 1000;

TransportManager.prototype.onReset = function() {
  this.removeAllListeners();
  this.execTaskIndex = -1;
  this.once('transport', this.onTransport);
  this.host.removeAllListeners('download');
  this.host.on('download', this.onDownload.bind(this)); // Save file when downloaded
  this.host.removeAllListeners('erase');

  //this.directory = new Directory(undefined, this.host);
  //this.task = [];
  //this.addDownloadTask(0);

};

TransportManager.prototype.onBeacon = function(beacon) {

  if (beacon.clientDeviceState.isTransport() && beacon.forHost(this.host.getHostSerialNumber()) &&
    this.host.layerState.isAuthentication()) {
    this.emit('transport');
  }
};

TransportManager.prototype.onBurst = function(burst) {

  var responseData,
    responseId;

  if (!(this.host.beacon.forHost(this.host.hostSerialNumber) &&
      this.host.layerState.isTransport()))
      {
        if (this.log.logging)
          this.log.log('log','Transport manager ignoring burst',this.host.beacon,this.host.layerState);
          return;
       }

  responseData = burst.subarray(ClientBeacon.prototype.PAYLOAD_LENGTH);
  responseId = responseData[1]; // Spec sec. 12 ANT-FS Host Command/Response

  switch (responseId) {

    case DownloadResponse.prototype.ID:

      this.onDownloadResponse(responseData);

      break;

    case EraseResponse.prototype.ID:

      this.onEraseResponse(responseData);

      break;

  }
};

TransportManager.prototype.onEraseResponse = function(responseData) {
  var response,
    NO_ERROR;

  response = new EraseResponse(responseData);

  this.session.response.push(response);

  if (this.log.logging)
    this.logger('log', response.toString());

  switch (response.result) {

    case EraseResponse.prototype.OK:

      this.directory.eraseFile(this.session.index);

      this.task[this.execTaskIndex].done  = true;

      this.host.emit('erase', NO_ERROR, this.session);

      break;

    default:

      this.task[this.execTaskIndex].done = (response.result !== EraseResponse.prototype.NOT_READY);

      this.host.emit('erase', response, this.session);
  }
};

TransportManager.prototype.onDownloadResponse = function(responseData) {
  var response,
    appendArray,
    offset,
    NO_ERROR,
    now;

  response = new DownloadResponse(responseData);
// TEST response.result = DownloadResponse.prototype.NOT_READY;

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
      // Spec. 9.5 'Host devices must be able to adapt to files being larger than listed in the directory'

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
        (this.session.timestamp && (now - this.session.timestamp) >= TransportManager.prototype.DOWNLOAD_PROGRESS_UPDATE_INTERVAL) ||
        offset >= response.fileSize) {
        this.session.timestamp = now;

        this.session.offset = offset;

        this.session.progress = this.session.offset / response.fileSize * 100;

        this.host.emit('download_progress', NO_ERROR, this.session);
      }

      if (offset < response.fileSize) {

        this.download(this.session.index, offset);
      } else {

        if (this.session.index === 0) {

          this.directory.decode(this.session.packets);
          this.host.emit('directory', this.directory.ls(this.session.maxBlockSize));
        }

        this.task[this.execTaskIndex].done  = true;

        this.host.emit('download', NO_ERROR, this.session);
      }

      break;

    default: // does not exist, exists not downloadable, not ready to download, request invalid, crc incorrect

      //console.error(response, this.session);

      this.task[this.execTaskIndex].done = (response.result !== DownloadResponse.prototype.NOT_READY);

      this.host.emit('download', response, this.session);

      break;

  }

};

TransportManager.prototype.onRequestSent = function(err, msg) {
  if (err && this.log.logging)
    this.log.log('error', 'Failed to send request to ANT', err);
};

TransportManager.prototype.sendRequest = function(request) {

  this.session.request.push(request);

  this.host.sendBurst(request, this.onRequestSent.bind(this));
};

TransportManager.prototype._setupSession = function (index)
{
  this.session = {
    index: index,
    request: [],
    response: [],
  };

  if (index === 0) {
      this.directory = new Directory(undefined, this.host);
      this.session.file = this.directory;
  } else {
      this.session.file = this.directory.getFile(index);
    }

  this.task[this.execTaskIndex].retry++;
};

TransportManager.prototype.download = function(index, offset) {
  var request,
    crcSeed;

  if (typeof offset === 'function') {

    this._setupSession(index);

    request = new DownloadRequest(index);
    // TEST  request.setMaxBlockSize(8);

    this.host.once('download', offset);

  } else {

    request = new DownloadRequest();

    // 'The seed value should equal the CRC value of the data received prior to the requested data offset' Spec. section 12.7.1

    crcSeed = crc.calc16(this.session.packets.subarray(0, offset));

    request.continueRequest(index, offset, crcSeed, this.session.request[0].maxBlockSize);
  }

  this.sendRequest(request);
};

TransportManager.prototype.erase = function(index, callback) {
  var request;

  this._setupSession(index);

  request = new EraseRequest(index);
  this.host.once('erase', callback);

  this.sendRequest(request);
};

TransportManager.prototype.onTransport = function() {

  var onNextTask = function _onNextTask(err, session) {

    var newFiles,
        inCompleteTask;

    this.execTaskIndex++;

    if (this.execTaskIndex === 1) { // First iteration downloads directory at index 0

      newFiles = this.directory.getNewFITfiles();

      if (newFiles && newFiles.length)
      {
        if (this.log.logging)
          this.log.log('log','New files available',newFiles);
      }

      newFiles.forEach(function (index) { this.addDownloadTask(index);}.bind(this));

    }

    if (this.execTaskIndex < this.task.length && !this.task[this.execTaskIndex].done) {

      if (this.log.logging)
        this.log.log('log','Executing task ' + this.execTaskIndex,this.task[this.execTaskIndex]);

      switch (this.task[this.execTaskIndex].request)
      {

        case DownloadRequest.prototype.ID :

          this.download(this.task[this.execTaskIndex].index, onNextTask);

          break;

        case EraseRequest.prototype.ID:

          // Removing a file on the device updates the directory, so erasing index 10, moves all indexes - 1
          this.erase(this.directory.indexOf(this.task[this.execTaskIndex].index) + 1, onNextTask);

          break;

      }

    } else {

      inCompleteTask = this.task.filter(function _taskFilter(task)  {  return !task.done && task.retry < 3; });

      //if (inCompleteTask.length) {

         setTimeout(function ()
                     {
                       this.execTaskIndex = -1; // Retry task if client was "not ready"
                       this.task[0].done = false;
                       onNextTask();
                     }.bind(this),100);
      //} else
      //   {
      //     this.host.disconnect(function _onDisconnect() { this.host.emit('transport_end'); });
      //   }
    }

  }.bind(this);

  this.host.layerState.set(State.prototype.TRANSPORT);

  onNextTask();

};

TransportManager.prototype.onDownloadProgress = function(error, session) {

var filename;

  if (!error && session && session.file) {
    filename = session.file.getFileName();

    if (this.log.logging)
      this.log.log('log', 'progress ' + Number(session.progress).toFixed(1) + '% ' + filename);
  }
};

TransportManager.prototype.onDownload = function(error, session) {

var filename;

  if (this.host.host.isNode() && !error && session && session.index) { // Won't save directory at index 0
    filename = session.file.getFileName();
    fs.writeFile(filename, new Buffer(session.packets), function(err) {
      if (err) {
        if (this.log.logging)
          this.log.log('error', 'Error writing ' + filename, err);
      } else {
        console.log('Downloaded ' + filename + ' (' + session.packets.byteLength + ' bytes)');
      }

    }.bind(this));
  } else
    if (error)
    {
      console.error('Failed download index ' + session.index + ' ' + error.toString());
    }

};

module.exports = TransportManager;
return module.exports;
