'use strict';
import EventEmitter from 'node:events';
import ClientBeacon from './client-beacon.js';
import DownloadRequest from '../request-response/download-request.js';
import DownloadResponse from '../request-response/download-response.js';
import EraseRequest from '../request-response/erase-request.js';
import EraseResponse from '../request-response/erase-response.js';
import UploadRequest from '../request-response/upload-request.js';
import UploadResponse from '../request-response/upload-request-response.js';
import UploadDataRequest from '../request-response/upload-data-request.js';
import UploadDataResponse from '../request-response/upload-data-response.js';
import CRC from './util/crc.js';
import State from './util/state.js';
import Directory from '../file/directory.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const crc = new CRC();

class TransportManager extends EventEmitter {
  constructor(host, download, erase, ls, skipNewFiles) {
    super();

    this.option = {
      download: download,
      erase: erase,
      ls: ls,
      skipNewFiles: skipNewFiles
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
      this.log.debug('Transport option', this.option);
  }


  onBeacon(beacon) {

    if (beacon.clientDeviceState.isTransport() && beacon.forHost(this.host.getHostSerialNumber()) &&
      this.host.layerState.isAuthentication()) {
      this.emit('transport');
    }

  }

  onBurst(burst) {

    let responseData,
      responseId;

    if (!(this.host.beacon.forHost(this.host.hostSerialNumber) &&
        this.host.layerState.isTransport()))
        {
            return;
         }

    responseData = burst.subarray(ClientBeacon.PAYLOAD_LENGTH);
    responseId = responseData[1]; // Spec sec. 12 ANT-FS Host Command/Response

    switch (responseId) {

      case DownloadResponse.ID:

        this.onDownloadResponse(responseData);

        break;

      case EraseResponse.ID:

        this.onEraseResponse(responseData);

        break;

      case UploadResponse.prototype.ID:

        this.onUploadResponse(responseData);

        break;

      case UploadDataResponse.ID:

        this.onUploadDataResponse(responseData);

        break;

    }

  }

  onReset() {

    clearTimeout(this.incompleteTaskTimeout);

    this.removeAllListeners();

    this.host.removeAllListeners('download_progress');
    this.host.removeAllListeners('download');
    this.host.removeAllListeners('erase');
    this.host.removeAllListeners('upload');

    this.once('transport', this.onTransport);


  }

  onErase(error,session) {
    let filename;

    session = session || this.session;

    filename = session.file.getFileName();

    if (!error) {
      if (this.log.logging) this.log.debug('Erased ' + filename);
    } else if (this.log.logging) {
      this.log.debug('Failed file erase index ' + session.index + ' ' + error.toString());
    }


  }

  addTask(request,index) {
    let split,
        indexArr = [],
        // http://stackoverflow.com/questions/1960473/unique-values-in-an-array
         onlyUnique = function (value, index, self) {
                          return self.indexOf(value) === index;
                      },
        uniqueArr;

    if (typeof index === 'string') //In case '10,11'-format
    {
         split = index.split(',');
         split.forEach(function (e) {
           let splitOnHyphen,
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

    const task = {
      request: request,
      index: index,
      done : false,
      retry : 0
    };

    if (this.log.logging)
      this.log.debug('Adding task',task);

    if (request === DownloadRequest.ID)
      this.task.splice(1,0,task); // Insert at front (erase tasks should follow download tasks)
    else
      this.task.push(task);

  }

  addDownloadTask(index) {

    this.addTask(DownloadRequest.ID,index);

  }

  addEraseTask(index) {

    this.addTask(EraseRequest.ID,index);

  }

  addUploadTask(index, data) {

    this.task.push({
      request: UploadRequest.ID,
      index: index,
      data: data,
      done: false,
      retry: 0
    });

  }

  onEraseResponse(responseData) {
    let response,
      NO_ERROR;

    response = new EraseResponse(responseData);

    this.session.response.push(response);

    if (this.log.logging)
      this.logger('log', response.toString());

    switch (response.result) {

      case EraseResponse.OK:

        this.directory.eraseFile(this.session.index);

        this.task[this.execTaskIndex].done  = true;

        this.host.emit('erase', NO_ERROR, this.session);

        break;

      default:

        this.task[this.execTaskIndex].done = (response.result !== EraseResponse.NOT_READY);

        this.host.emit('erase', response, this.session);
    }

  }

  onUploadResponse(responseData) {
    let response,
      session = this.session;

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

  }

  onUploadDataResponse(responseData) {
    let response,
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

    if (response.result !== UploadDataResponse.OK) {

      // Ask the client where to continue (offset + CRC) instead of guessing what it has received
      if (++upload.retry > this.constructor.MAX_UPLOAD_RETRIES) {
        this._finishUpload(new Error('Upload failed after ' + this.constructor.MAX_UPLOAD_RETRIES + ' retries at offset ' + upload.offset), false);
        return;
      }

      this.sendRequest(new UploadRequest(session.index, upload.data.byteLength, UploadRequest.CONTINUE_OFFSET));
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

  }

  _uploadBlock(offset) {
    let upload = this.session.upload,
      remaining = upload.data.byteLength - offset,
      blockLength = remaining,
      maxBlock = Math.floor(upload.maxBlockSize / UploadDataRequest.PACKET_LENGTH) * UploadDataRequest.PACKET_LENGTH,
      request;

    // Only split when the remaining data does not fit in one block (non-final blocks must be whole 8 byte packets)
    if (upload.maxBlockSize > 0 && blockLength > upload.maxBlockSize)
      blockLength = maxBlock > 0 ? maxBlock : upload.maxBlockSize;

    request = new UploadDataRequest(this.session.crcSeed, offset, upload.data.subarray(offset, offset + blockLength));

    upload.offset = offset;
    upload.blockLength = blockLength;
    upload.blockCrc = crc.updateCRC16(this.session.crcSeed, request.data);

    this.sendRequest(request);

  }

  _finishUpload(error, final) {
    const task = this.task[this.execTaskIndex];

    if (task && task.request === UploadRequest.ID)
      task.done = !error || !!final;

    this.host.emit('upload', error, this.session);

  }

  upload(index, data, callback) {
    let request,
      file;

    if (data instanceof ArrayBuffer)
      data = new Uint8Array(data);

    if (!(data instanceof Uint8Array) || !data.byteLength)
      return callback(new Error('Upload data must be a non-empty Uint8Array'));

    if (typeof index !== 'number' || index < 1 || index >= UploadRequest.COMMAND_PIPE)
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

  }

  getBackupDirectory() {
    let dataHome;

    if (this.host.option && this.host.option.dataDir)
      return path.resolve(this.host.option.dataDir);

    dataHome = process.env.XDG_DATA_HOME;

    if (!dataHome || !path.isAbsolute(dataHome))
      dataHome = path.join(os.homedir(), '.local', 'share');

    return path.join(dataHome, 'libantjs');

  }

  getDeviceDirectory() {
    const serial = this.host.authenticationManager && this.host.authenticationManager.clientSerialNumber;

    return serial ? path.join(this.getBackupDirectory(), String(serial)) : this.getBackupDirectory();

  }

  uploadWithBackup(index, data, callback) {

    this.download(index, function _onBackupDownload(err, session) {
      let backupName,
          backupError;

      if (err) {
        return callback(new Error('Backup of index ' + index + ' failed, upload aborted: ' + err.toString()));
      }

      backupName = path.join(this.getDeviceDirectory(), session.file.getFileName(false, true) + '.backup-' + new Date().toISOString().replace(/[:.]/g, '-'));

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
        this.log.debug( 'Backed up index ' + index + ' to ' + backupName);

      this.upload(index, data, function _onUploaded(uploadErr, uploadSession) {
        if (uploadSession)
          uploadSession.backup = backupName;
        callback(uploadErr, uploadSession);
      });
    }.bind(this));

  }

  onUpload(error, session) {

    session = session || this.session;

    if (this.log.logging) {
      if (error)
        this.log.error( 'Failed upload index ' + session.index + ' ' + error.toString());
      else
        this.log.debug( 'Uploaded ' + session.upload.data.byteLength + ' bytes to index ' + session.index);
    }

  }

  onDownloadResponse(responseData) {
    let response,
      appendArray,
      offset,
      NO_ERROR,
      now;

    if (responseData.byteLength < DownloadResponse.HEADER_LENGTH + DownloadResponse.FOOTER_LENGTH) {
      this._failDownload(new Error('Download response is shorter than its header and footer'));
      return;
    }

    response = new DownloadResponse(responseData);

    if (response.result === DownloadResponse.OK &&
        (response.length > responseData.byteLength - DownloadResponse.HEADER_LENGTH - DownloadResponse.FOOTER_LENGTH ||
         response.offset > response.fileSize ||
         response.length > response.fileSize - response.offset ||
         response.fileSize > this.constructor.MAX_DOWNLOAD_FILE_SIZE)) {
      this._failDownload(new Error('Invalid download response bounds (offset ' + response.offset +
        ', length ' + response.length + ', file size ' + response.fileSize + ')'));
      return;
    }

    if (response.result === DownloadResponse.OK &&
        response.CRC !== crc.updateCRC16(this.session.request[this.session.request.length - 1].crcSeed, response.packets)) {
      this._failDownload(new Error('Download response CRC mismatch'));
      return;
    }

    this.session.response.push(response);

    if (this.log.logging)
      this.logger('log', response.toString());

    switch (response.result) {

      case DownloadResponse.OK:

        if (response.offset === 0) {

          this.session.packets = new Uint8Array(response.fileSize);

          if (this.session.request[0].maxBlockSize === 0) // Infer client block length
            this.session.maxBlockSize = response.length;

          if (this.session.index) {
            if (this.log.logging)
            this.log.debug('Downloading ' + this.session.file.getFileName() + ' (' + response.fileSize + ' bytes)');
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
          (this.session.timestamp && (now - this.session.timestamp) >= TransportManager.DOWNLOAD_PROGRESS_UPDATE_INTERVAL) ||
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

        this.task[this.execTaskIndex].done = (response.result !== DownloadResponse.NOT_READY);

        this.host.emit('download', response, this.session);

        break;

    }


  }

  _failDownload(error) {
    if (this.task[this.execTaskIndex])
      this.task[this.execTaskIndex].done = true;

    this.host.emit('download', error, this.session);

  }

  onRequestSent(err) {
    let message;

    if (err) {
       message = 'Failed to send request to ANT';

      if (this.log.logging)
        this.log.error( message, err);

      if (this.session.request[0] instanceof DownloadRequest)
         this.emit('download', err); // Continue with next task
      else if (this.session.request[0] instanceof EraseRequest)
        this.emit('erase', err);
      else if (this.session.request[0] instanceof UploadRequest)
        this.host.emit('upload', err, this.session);
    }


  }

  sendRequest(request) {

    this.session.request.push(request);

    this.host.sendBurst(request).then(() => this.onRequestSent(), (err) => this.onRequestSent(err));

  }

  _setupSession(index) {
    this.session = {
      index: index,
      request: [],
      response: [],
      crcOffset: 0,
      crcSeed: 0
    };

    if (index === 0) {
        this.log.debug( this.host.authenticationManager.getAuthorizationStatus());
        this.directory = new Directory(undefined, this.host);
        this.session.file = this.directory;
    } else {
        this.session.file = this.directory.getFile(index);
      }

    this.task[this.execTaskIndex].retry++;

  }

  download(index, offset) {
    let request,
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

  }

  erase(index, callback) {
    let request;

    this._setupSession(index);

    request = new EraseRequest(index);
    this.host.once('erase', callback);
    this.host.once('erase', this.onErase.bind(this));

    this.sendRequest(request);

  }

  onDownloadProgress(error, session) {

  let filename;

    if (!error && session && session.file) {
      filename = session.file.getFileName();

      if (this.log.logging)
        this.log.debug( 'progress ' + Number(session.progress).toFixed(1) + '% ' + filename);
    }

  }

  onDownload(error, session) {

  let filename;

     session = session || this.session; // In case .emit('download'/'erase') without reference to session (when max retries reached in host sendrequest)

    if (!error && session && session.index === 0) {
      filename = path.join(this.getDeviceDirectory(), session.file.getFileName() + '.txt');
      try {
        fs.mkdirSync(path.dirname(filename), { recursive: true });
        fs.writeFileSync(filename, session.file.ls());
        this.log.debug( 'Directory file stored at ' + filename);
      } catch (e) {
        if (this.log.logging)
          this.log.error( 'Error writing directory listing ' + filename, e);
      }
    } else if (!error && session && session.index) {
      filename = path.join(this.getDeviceDirectory(), session.file.getFileName(false, true));
      try {
        fs.mkdirSync(path.dirname(filename), { recursive: true });
      } catch (e) {
        if (this.log.logging)
          this.log.error( 'Error creating directory for ' + filename, e);
        return;
      }
      fs.writeFile(filename, Buffer.from(session.packets), function(err) {
        if (err) {
          if (this.log.logging)
            this.log.error( 'Error writing ' + filename, err);
        }

      }.bind(this));
    } else
      if (error)
      {
        if (this.log.logging) this.log.error('Failed download index ' + session.index + ' ' + error.toString());
      }


  }

  onTransport() {

    let onNextTask = function _onNextTask(err) {

      let newFiles,
          inCompleteTask;

      if (err)
      {
        if (this.log.logging)
        this.log.error(err);
      }

      this.execTaskIndex++;

      if (this.execTaskIndex === 1 && !this.option.skipNewFiles) { // First iteration downloads directory at index 0

        newFiles = this.directory.getNewFITfiles();

        if (newFiles && newFiles.length)
        {
          if (this.log.logging)
            this.log.debug('New files available',newFiles);
        }

        newFiles.forEach(function (index) { this.addDownloadTask(index);}.bind(this));

      }

      if (this.execTaskIndex < this.task.length && !this.task[this.execTaskIndex].done) {

        if (this.log.logging)
          this.log.debug('Executing task ' + this.execTaskIndex,this.task[this.execTaskIndex]);

        switch (this.task[this.execTaskIndex].request)
        {

          case DownloadRequest.ID :

            this.download(this.task[this.execTaskIndex].index, onNextTask);

            break;

          case EraseRequest.ID: {

            const originalIndicesToDelete = this.task
              .filter(function(t) { return t.request === EraseRequest.ID; })
              .map(function(t) { return t.index; });

            const eraseLoop = function() {
              const nextFileToErase = this.directory.file.find(function(f) {
                return originalIndicesToDelete.indexOf(f.index) !== -1;
              });

              if (nextFileToErase) {
                const onErase = function(err) {
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
                this.task.forEach(function(t) { if (t.request === EraseRequest.ID) t.done = true; });
                onNextTask();
              }
            }.bind(this);

            eraseLoop();

            break;
          }

          case UploadRequest.ID:

            this.uploadWithBackup(this.task[this.execTaskIndex].index, this.task[this.execTaskIndex].data, onNextTask);

            break;

        }

      }
      else {

        inCompleteTask = this.task.filter(function _taskFilter(task)  {  return !task.done && task.retry < 3; });

        if (inCompleteTask.length) {

          this.incompleteTaskTimeout =  setTimeout(function _retryIncompleteTask()
                       {
                         this.execTaskIndex = -1;
                         onNextTask();
                       }.bind(this),100);
        } else
           {
             const onDisconnect = () => this.host.host.emit('transport_end');
             this.host.disconnect().then(onDisconnect, onDisconnect);
           }
      }

    }.bind(this);

    this.host.layerState.set(State.TRANSPORT);

    this.execTaskIndex = -1;

    if (this.log.logging)
     this.log.debug('Starting with task', this.task);

    onNextTask();


  }


  static DOWNLOAD_PROGRESS_UPDATE_INTERVAL = 1000;
  static MAX_UPLOAD_RETRIES = 3;
  static MAX_DOWNLOAD_FILE_SIZE = 256 * 1024 * 1024;
}








// Queue an upload (overwrite) of the file at directory index. Executed in transport state after downloads/erases











// Overwrites the file at directory index (index 0 is the directory and 0xFFFE the command pipe, they are not allowed here)

// Base directory is the dataDir option of the client program, defaulting to $XDG_DATA_HOME/libantjs
// (XDG Base Directory spec: ~/.local/share if unset; relative values must be ignored)

// Files are stored per device: <dataDir>/<client serial number>

// Downloads the existing file and saves a timestamped copy before overwriting it. Upload is aborted if the backup fails.












export default TransportManager;
