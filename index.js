"use strict";

var net = require('net');
var util = require('util');

class TorControlClient {
  constructor(options) {
    if(options) {
      this.torHost = options.host ? options.Host : '127.0.0.1';
      this.torControlPort = options.port ? options.port : 9051;
      this.torControlPassword = options.password ? options.password : null;      
    }
    this.initialized = false;
    this.sendLocked = false;
    this.controlSocket = null;
    this.CMD_QUEUE_INTERVAL = 100; // milliseconds
    this.CMD_MAX_RETRY = 10; // number of retries
  }
  _sendLockAcquire() {
    if(this.sendLocked) {
      // already locked
      return false;
    } else {
      this.sendLocked = true;
      return true;
    }
  }
  _sendLockRelease() {
    this.sendLocked = false;
  }
  init(cb) {
    if(!this.initialized && this._sendLockAcquire()) {
      if(this.password === null) {
        // authentication is not required
        this.controlSocket = net.createConnection({host: this.torHost,
          port: this.torControlPort}, (function() {
            this.initialized = true;
          }).bind(this));
      } else {
        this.controlSocket = net.createConnection({host: this.torHost,
          port: this.torControlPort}, (function() {
            this.controlSocket.write('AUTHENTICATE "' + this.torControlPassword + '"\r\n');
          }).bind(this));
          function authenticateListener(data) {
            let error;
            this._sendLockRelease();
            data = data.toString();
            if(data.search(/250 OK/) != -1)  {
              this.initialized = true;
            } else {
              if(data.search(/515 Authentication failed/) != -1) {
                error = new Error('Tor Authentication Error');
              }
            }
            this.controlSocket.removeAllListeners('data');
            if(cb && typeof(cb) == 'function') {
              cb(error);
            } else if(error) {
              throw(error);
            }
          }
        this.controlSocket.on('data', (authenticateListener).bind(this));
      }
    }
  }
  _formatCommand(cmd) {
    return cmd + '\r\n';
  }
  _formatData(data) {
    return data.replace(/(\r\n)/gm,"");
  }
  sendCommand(cmd, cb, retryNum) {
    retryNum = retryNum ? retryNum : 0;
    if(this.initialized && this._sendLockAcquire()) {
      this.controlSocket.write(this._formatCommand(cmd));
      this.controlSocket.on('data', (function(data) {
        let error = null;
        data = data.toString();
        this.controlSocket.removeAllListeners('data');
        this._sendLockRelease();
        if(cb && typeof(cb) == 'function') {
          cb(error, this._formatData(data));
        }
      }).bind(this));
    } else if(this.initialized) {
      console.log('retryNum', retryNum);
      // there was no lock available queue the command
      if(retryNum < this.CMD_MAX_RETRY) {
        retryNum++;
        setTimeout((this.sendCommand).bind(this), this.CMD_QUEUE_INTERVAL, cmd, cb, retryNum);
      }
    }
  }
  end() {
    this.controlSocket.unref();
  }
}

module.exports = TorControlClient;
