'use strict';

const loglevel = require('loglevel');

let nextLoggerId = 0;

function Logger(options) {
  this.options = options;
  this.console = console;
  this._logger = loglevel.getLogger(`libantjs-${nextLoggerId++}`);

  Object.defineProperty(this, 'logging', {
    get: function() {
      return this._logging;
    },
    set: function(newValue) {
      this._logging = Boolean(newValue);
      if (this._logger)
        this._logger.setLevel(this._logging ? 'debug' : 'silent');
    }
  });

  if (typeof options === 'object' && options !== null)
    this.logging = options.log;
  else
    this.logging = options;

  this._logger.methodFactory = (methodName) => {
    const consoleMethod = methodName === 'debug' || methodName === 'trace' ? 'log' : methodName;

    return (...args) => {
      if (!this.logging || !this.console)
        return;

      const output = this.console[consoleMethod] || this.console.log;
      if (typeof output !== 'function')
        return;

      let header = Date.now().toString();
      if (this.options && this.options.logSource) {
        const logSource = typeof this.options.logSource === 'string'
          ? this.options.logSource
          : this.options.logSource.constructor.name;
        header += ` ${logSource}:`;
      }

      const outputArguments = [header];
      for (const arg of args) {
        if (arg instanceof Uint8Array)
          outputArguments.push(this._formatUint8Array(arg));
        outputArguments.push(arg);
      }

      output.apply(this.console, outputArguments);
    };
  };

  this._logger.setLevel(this.logging ? 'debug' : 'silent');
}

Logger.prototype._formatUint8Array = function(arg) {
  if (!(arg instanceof Uint8Array))
    return arg;

  let msg = 'Uint8Array < ';
  const maxBytesToFormat = 32;
  let i;
  for (i = 0; i < arg.length && i < maxBytesToFormat; i++) {
    const prefix = arg[i] <= 0x0F ? '0' : '';
    msg += `${prefix}${arg[i].toString(16)} `;
  }

  if (i < arg.length)
    msg += '...>';
  else
    msg += '>';

  return msg;
};

for (const method of ['trace', 'debug', 'info', 'warn', 'error']) {
  Logger.prototype[method] = function() {
    this._logger[method].apply(this._logger, arguments);
  };
}

Logger.prototype.log = function(type) {
  const method = type === 'log' ? 'debug' : type;
  if (['trace', 'debug', 'info', 'warn', 'error'].includes(method)) {
    this[method].apply(this, Array.prototype.slice.call(arguments, 1));
  } else if (this.console && typeof this.console.warn === 'function') {
    this.console.warn(Date.now(), 'Unknown console function ' + type, arguments);
  }
};

Logger.prototype.setLevel = function(level) {
  this._logger.setLevel(level);
  this._logging = this._logger.getLevel() < this._logger.levels.SILENT;
};

Logger.prototype.getLevel = function() {
  return this._logger.getLevel();
};

Logger.prototype.changeConsole = function(newConsole) {
  if (newConsole)
    this.console = newConsole;
};

Logger.prototype.time = function(name) {
  if (this.logging && this.console && this.console.time)
    this.console.time(name);
};

Logger.prototype.timeEnd = function(name) {
  if (this.logging && this.console && this.console.timeEnd)
    this.console.timeEnd(name);
};

module.exports = Logger;
