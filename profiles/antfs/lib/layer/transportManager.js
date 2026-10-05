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

  UploadRequest = require('../request-response/uploadRequest'),
  UploadResponse = require('../request-response/uploadRequestResponse'),

  UploadDataRequest = require('../request-response/uploadDataRequest'),
  UploadDataResponse = require('../request-response/uploadDataResponse'),

  CRC = require('./util/crc'),
  crc = new CRC(),

  State = require('./util/state'),

  Directory = require('../file/directory'),

  fs = require('fs'),
  os = require('os'),
  path = require('path');

// heap = require('/usr/lib/node_modules/heapdump');

function TransportManager(host, download,erase,ls,skipNewFiles) {

  EventEmitter.call(this);

  this.option = {
    download : download,
    erase : erase,
    ls : ls,
    skipNewFiles : skipNewFiles
  };

  this.host = host;

  this.log = this.host.log;
  this.logger = this.host.log.log.bind(this.host.log);

  this.host.on('reset', this.onReset.bind(this));
  this.host.on('beacon', this.onBeacon.bind(this));
  this.host.on('burst', this.onBurst.bind(this));

  this.once('transport', this.onTransport);

  this.task = [];
  this.execTaskIndex = -1;
  this.addDownloadTask(0);

  this.addDownloadTask(download);
  this.addEraseTask(erase);

  if (this.log.logging)
    this.log.log('log','Transport option',this.option);

}

TransportManager.prototype = Object.create(EventEmitter.prototype);
TransportManager.prototype.constructor = TransportManager;

TransportManager.prototype.onBeacon = function(beacon) {

  if (beacon.clientDeviceState.isTransport() && beacon.forHost(this.host.getHostSerialNumber()) &&
    this.host.layerState.isAuthentication()) {
    //console.log('Listener for transport-ev',this.listeners('transport'));
    this.emit('transport');
  }
};

TransportManager.prototype.onBurst = function(burst) {

  var responseData,
    responseId;

  if (!(this.host.beacon.forHost(this.host.hostSerialNumber) &&
      this.host.layerState.isTransport()))
      {
        //if (this.log.logging)
        //  this.log.log('log','Transport manager ignoring burst',this.host.beacon,this.host.layerState);
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

    case UploadResponse.prototype.ID:

      this.onUploadResponse(responseData);

      break;

    case UploadDataResponse.prototype.ID:

      this.onUploadDataResponse(responseData);

      break;

  }
};

TransportManager.prototype.onReset = function() {

  clearTimeout(this.incompleteTaskTimeout);

  this.removeAllListeners();

  this.host.removeAllListeners('download_progress');
  this.host.removeAllListeners('download');
  this.host.removeAllListeners('erase');
  this.host.removeAllListeners('upload');

  this.once('transport', this.onTransport);

};

TransportManager.prototype.onErase = function (error,session)
{
  var filename;

  session = session || this.session;

  filename = session.file.getFileName();

  if (!error)
    if (this.log.logging) this.log.log('log','Erased ' + filename);
  else
   if (this.log.logging) this.log.log('log','Failed file erase index ' + session.index + ' ' + error.toString());

};

TransportManager.prototype.addTask = function (request,index)
{
  var split,
      filteredSplit,
      indexArr = [],
      // http://stackoverflow.com/questions/1960473/unique-values-in-an-array
       onlyUnique = function (value, index, self) {
                        return self.indexOf(value) === index;
                    },
      uniqueArr;

  if (typeof index === 'string') //In case '10,11'-format
  {
       split = index.split(',');
       split.forEach(function (e,i) {
         var splitOnHyphen,
             min,minNum,
             max,maxNum,
             j;

         if (isNaN(e))
         {
           splitOnHyphen = e.split('-'); // Allow '10-20' format
            if (splitOnHyphen.length >= 2)
            {
              minNum = Number(splitOnHyphen[0]);
              maxNum = Number(splitOnHyphen[1]);
              min = Math.min(minNum,maxNum);
              max = Math.max(minNum,maxNum);

              if (!isNaN(min) && !isNaN(max))
              {
                for (j=min;j<=max;j++)
                  indexArr.push(j);
              }
            }
         } else {
             indexArr.push(Number(e));
         }
       });

       uniqueArr = indexArr.filter(onlyUnique);
       this.addTask(request,uniqueArr);
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

// Queue an upload (overwrite) of the file at directory index. Executed in transport state after downloads/erases
TransportManager.prototype.addUploadTask = function(index, data) {

  this.task.push({
    request: UploadRequest.prototype.ID,
    index: index,
    data: data,
    done: false,
    retry: 0
  });
};

TransportManager.prototype.DOWNLOAD_PROGRESS_UPDATE_INTERVAL = 1000;

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

TransportManager.prototype.MAX_UPLOAD_RETRIES = 3;

TransportManager.prototype.onUploadResponse = function(responseData)
{
  var response,
    session = this.session,
    NO_ERROR;

  if (!session || !session.upload)
    return;

  response = new UploadResponse(responseData);

  session.response.push(response);

  if (this.log.logging)
    this.logger('log', response.toString());

  switch (response.response) {

    case UploadResponse.prototype.OK:

      if (session.upload.data.byteLength > response.maxFileSize) {
        this._finishUpload(new Error('File size ' + session.upload.data.byteLength + ' exceeds client max file size ' + response.maxFileSize), true);
        return;
      }

      if (response.offset > session.upload.data.byteLength) {
        this._finishUpload(new Error('Client upload offset ' + response.offset + ' is beyond file size'), true);
        return;
      }

      session.upload.maxBlockSize = response.maxBlockSize;
      session.crcSeed = response.CRC;
      this._uploadBlock(response.offset);

      break;

    default: // does not exist, exists not writable, not enough space, invalid, not ready

      this._finishUpload(response, response.response !== UploadResponse.prototype.NOT_READY);

      break;
  }
};

TransportManager.prototype.onUploadDataResponse = function(responseData)
{
  var response,
    session = this.session,
    upload,
    offset;

  if (!session || !session.upload)
    return;

  upload = session.upload;

  response = new UploadDataResponse(responseData);

  session.response.push(response);

  if (this.log.logging)
    this.logger('log', response.toString() + ' raw ' + Array.prototype.map.call(responseData, function(b) { return ('0' + b.toString(16)).slice(-2); }).join(' ') +
      ' | sent ' + session.request[session.request.length - 1].toString() + ' block crc 0x' + upload.blockCrc.toString(16) + ' maxBlockSize ' + upload.maxBlockSize);

  if (response.result !== UploadDataResponse.prototype.OK) {

    // Ask the client where to continue (offset + CRC) instead of guessing what it has received
    if (++upload.retry > this.MAX_UPLOAD_RETRIES) {
      this._finishUpload(new Error('Upload failed after ' + this.MAX_UPLOAD_RETRIES + ' retries at offset ' + upload.offset), false);
      return;
    }

    this.sendRequest(new UploadRequest(session.index, upload.data.byteLength, UploadRequest.prototype.CONTINUE_OFFSET));
    return;
  }

  upload.retry = 0;

  session.crcSeed = upload.blockCrc;
  offset = upload.offset + upload.blockLength;

  session.offset = offset;
  session.progress = offset / upload.data.byteLength * 100;

  this.host.emit('upload_progress', undefined, session);

  if (offset < upload.data.byteLength)
    this._uploadBlock(offset);
  else
    this._finishUpload();
};

TransportManager.prototype._uploadBlock = function(offset)
{
  var upload = this.session.upload,
    remaining = upload.data.byteLength - offset,
    blockLength = remaining,
    maxBlock = Math.floor(upload.maxBlockSize / UploadDataRequest.prototype.PACKET_LENGTH) * UploadDataRequest.prototype.PACKET_LENGTH,
    request;

  // Only split when the remaining data does not fit in one block (non-final blocks must be whole 8 byte packets)
  if (upload.maxBlockSize > 0 && blockLength > upload.maxBlockSize)
    blockLength = maxBlock > 0 ? maxBlock : upload.maxBlockSize;

  request = new UploadDataRequest(this.session.crcSeed, offset, upload.data.subarray(offset, offset + blockLength));

  upload.offset = offset;
  upload.blockLength = blockLength;
  upload.blockCrc = crc.updateCRC16(this.session.crcSeed, request.data);

  this.sendRequest(request);
};

TransportManager.prototype._finishUpload = function(error, final)
{
  var task = this.task[this.execTaskIndex];

  if (task && task.request === UploadRequest.prototype.ID)
    task.done = !error || !!final;

  this.host.emit('upload', error, this.session);
};

// Overwrites the file at directory index (index 0 is the directory and 0xFFFE the command pipe, they are not allowed here)
TransportManager.prototype.upload = function(index, data, callback) {
  var request,
    file;

  if (data instanceof ArrayBuffer)
    data = new Uint8Array(data);

  if (!(data instanceof Uint8Array) || !data.byteLength)
    return callback(new Error('Upload data must be a non-empty Uint8Array'));

  if (typeof index !== 'number' || index < 1 || index >= UploadRequest.prototype.COMMAND_PIPE)
    return callback(new Error('Invalid upload index ' + index));

  file = this.directory && this.directory.getFile(index);

  if (this.directory && !file)
    return callback(new Error('No file at index ' + index));

  if (file && !file.permission.write)
    return callback(new Error('File at index ' + index + ' is not writable'));

  this.session = {
    index: index,
    request: [],
    response: [],
    crcSeed: 0,
    file: file,
    upload: {
      data: data,
      offset: 0,
      retry: 0,
      maxBlockSize: 0
    }
  };

  if (this.execTaskIndex >= 0 && this.task[this.execTaskIndex])
    this.task[this.execTaskIndex].retry++;

  this.host.once('upload', function _onUpload(err, session) {
    this.onUpload(err, session);
    callback(err, session);
  }.bind(this));

  request = new UploadRequest(index, data.byteLength, 0);

  this.sendRequest(request);
};

// XDG Base Directory spec: $XDG_DATA_HOME, defaulting to ~/.local/share (relative values must be ignored)
TransportManager.prototype.getBackupDirectory = function() {
  var dataHome = process.env.XDG_DATA_HOME;

  if (!dataHome || !path.isAbsolute(dataHome))
    dataHome = path.join(os.homedir(), '.local', 'share');

  return path.join(dataHome, 'getfit');
};

// Downloads the existing file and saves a timestamped copy before overwriting it. Upload is aborted if the backup fails.
TransportManager.prototype.uploadWithBackup = function(index, data, callback) {

  this.download(index, function _onBackupDownload(err, session) {
    var backupName,
        backupError;

    if (err) {
      return callback(new Error('Backup of index ' + index + ' failed, upload aborted: ' + err.toString()));
    }

    backupName = path.join(this.getBackupDirectory(), session.file.getFileName() + '.backup-' + new Date().toISOString().replace(/[:.]/g, '-'));

    try {
      fs.mkdirSync(path.dirname(backupName), { recursive: true });
      fs.writeFileSync(backupName, Buffer.from(session.packets));
    } catch (e) {
      backupError = e;
    }

    if (backupError) {
      return callback(new Error('Could not write backup ' + backupName + ', upload aborted: ' + backupError.toString()));
    }

    if (this.log.logging)
      this.log.log('log', 'Backed up index ' + index + ' to ' + backupName);

    this.upload(index, data, function _onUploaded(uploadErr, uploadSession) {
      if (uploadSession)
        uploadSession.backup = backupName;
      callback(uploadErr, uploadSession);
    });
  }.bind(this));
};

TransportManager.prototype.onUpload = function(error, session) {

  session = session || this.session;

  if (this.log.logging) {
    if (error)
      this.log.log('error', 'Failed upload index ' + session.index + ' ' + error.toString());
    else
      this.log.log('log', 'Uploaded ' + session.upload.data.byteLength + ' bytes to index ' + session.index);
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

        if (this.session.index) {
          if (this.log.logging)
          this.log.log('log','Downloading ' + this.session.file.getFileName() + ' (' + response.fileSize + ' bytes)');
        }

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

      if (response.offset === this.session.crcOffset) {
        this.session.crcSeed = crc.updateCRC16(this.session.crcSeed, response.packets);
      } else {
        this.session.crcSeed = crc.calc16(this.session.packets.subarray(0, response.offset + response.length));
      }
      this.session.crcOffset = response.offset + response.length;

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

        // TEST this.task[this.execTaskIndex].done  = false;
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
  var message;

  if (err) {
     message = 'Failed to send request to ANT';

    if (this.log.logging)
      this.log.log('error', message, err);

    if (this.session.request[0] instanceof DownloadRequest)
       this.emit('download', err); // Continue with next task
    else if (this.session.request[0] instanceof EraseRequest)
      this.emit('erase', err);
    else if (this.session.request[0] instanceof UploadRequest)
      this.host.emit('upload', err, this.session);
  }

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
    crcOffset: 0,
    crcSeed: 0
  };

  if (index === 0) {
      console.log(this.host.authenticationManager.getAuthorizationStatus());
      this.directory = new Directory(undefined, this.host);
      this.session.file = this.directory;
  } else {
      this.session.file = this.directory.getFile(index);
    }

  this.task[this.execTaskIndex].retry++;
};

TransportManager.prototype.download = function(index, offset) {
  var request,
    crcSeed,
    downloadProgressFunc = this.onDownloadProgress.bind(this),
    onDownload = function _onDownload(e,m)
    {
      this.host.removeListener('download_progress',downloadProgressFunc);
      this.onDownload.call(this,e,m);
    }.bind(this);

  if (typeof offset === 'function') {

    this._setupSession(index);

    request = new DownloadRequest(index);
    // TEST  request.setMaxBlockSize(8);

    this.host.once('download', offset);

    this.host.on('download_progress', downloadProgressFunc);

    this.host.once('download', onDownload);

  } else {

    request = new DownloadRequest();

    // 'The seed value should equal the CRC value of the data received prior to the requested data offset' Spec. section 12.7.1

    crcSeed = this.session.crcSeed;

    request.continueRequest(index, offset, crcSeed, this.session.request[0].maxBlockSize);
  }

  this.sendRequest(request);
};

TransportManager.prototype.erase = function(index, callback) {
  var request;

  this._setupSession(index);

  request = new EraseRequest(index);
  this.host.once('erase', callback);
  this.host.once('erase', this.onErase.bind(this));

  this.sendRequest(request);
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

   session = session || this.session; // In case .emit('download'/'erase') without reference to session (when max retries reached in host sendrequest)

  if (!error && session && session.index) { // Won't save directory at index 0
    filename = session.file.getFileName();
    fs.writeFile(filename, new Buffer(session.packets), function(err) {
      if (err) {
        if (this.log.logging)
          this.log.log('error', 'Error writing ' + filename, err);
      } else {
        //console.log('Downloaded ' + filename + ' (' + session.packets.byteLength + ' bytes)');
      }

    }.bind(this));
  } else
    if (error)
    {
      if (this.log.logging) this.log.log('error','Failed download index ' + session.index + ' ' + error.toString());
    }

};

TransportManager.prototype.onTransport = function() {

  var onNextTask = function _onNextTask(err, session) {

    var newFiles,
        inCompleteTask;

    if (err)
    {
      if (this.log.logging)
      this.log.log('error',err);
    }

    this.execTaskIndex++;

    if (this.execTaskIndex === 1 && !this.option.skipNewFiles) { // First iteration downloads directory at index 0

      newFiles = this.directory.getNewFITfiles();

      if (newFiles && newFiles.length)
      {
        if (this.log.logging)
          this.log.log('log','New files available',newFiles);
      }

      newFiles.forEach(function (index) { this.addDownloadTask(index);}.bind(this));

    }

    /* TEST if (this.task[this.execTaskIndex])
            this.task[this.execTaskIndex].done = false; */


    if (this.execTaskIndex < this.task.length && !this.task[this.execTaskIndex].done) {

      if (this.log.logging)
        this.log.log('log','Executing task ' + this.execTaskIndex,this.task[this.execTaskIndex]);

      switch (this.task[this.execTaskIndex].request)
      {

        case DownloadRequest.prototype.ID :

          this.download(this.task[this.execTaskIndex].index, onNextTask);

          break;

        case EraseRequest.prototype.ID:

          var originalIndicesToDelete = this.task
            .filter(function(t) { return t.request === EraseRequest.prototype.ID; })
            .map(function(t) { return t.index; });

          var eraseLoop = function() {
            var nextFileToErase = this.directory.file.find(function(f) {
              return originalIndicesToDelete.indexOf(f.index) !== -1;
            });

            if (nextFileToErase) {
              var onErase = function(err) {
                if (err) {
                  return onNextTask(err);
                }
                // Re-download directory to get updated file indices and continue loop
                this.download(0, function(downloadErr) {
                  if (downloadErr) {
                    return onNextTask(downloadErr);
                  }
                  eraseLoop();
                });
              }.bind(this);

              this.erase(nextFileToErase.index, onErase);
            } else {
              // No more files to erase from the list, mark tasks as done and proceed
              this.task.forEach(function(t) { if (t.request === EraseRequest.prototype.ID) t.done = true; });
              onNextTask();
            }
          }.bind(this);

          eraseLoop();

          break;

        case UploadRequest.prototype.ID:

          this.uploadWithBackup(this.task[this.execTaskIndex].index, this.task[this.execTaskIndex].data, onNextTask);

          break;

      }

    }
    else {

      inCompleteTask = this.task.filter(function _taskFilter(task)  {  return !task.done && task.retry < 3; });

    // TEST inCompleteTask = { length : 1};

      if (inCompleteTask.length) {

        this.incompleteTaskTimeout =  setTimeout(function _retryIncompleteTask()
                     {
                       this.execTaskIndex = -1;
                       onNextTask();
                     }.bind(this),100);
      } else
         {
           // TEST  this.execTaskIndex = -1;
           // TEST   onNextTask();
           // TEST ignore busy state
           if (this.log.loggging)
             console.timeEnd('Transport');
           this.host.disconnect(function _onDisconnect() { this.host.emit('transport_end'); });
         }
    }

  }.bind(this);

  this.host.layerState.set(State.prototype.TRANSPORT);

  this.execTaskIndex = -1;

  if (this.log.logging)
   this.log.log('log','Starting with task', this.task);

  // TEST ignore busy state
  if (this.log.logging)
    console.time('Transport');

  onNextTask();

/*
  var req = new UploadRequest(UploadRequest.prototype.COMMAND_PIPE,16384,0);
  console.log('upload req',req);

  this.session = {
    index: UploadRequest.prototype.COMMAND_PIPE,
    request: [],
    response: [],
  };

  this.sendRequest(req); */

};

module.exports = TransportManager;
