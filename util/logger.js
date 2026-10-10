'use strict';
import loglevel from 'loglevel';



let nextLoggerId = 0;

class Logger {
  constructor(options) {
    this.options = options;
    this.console = console;
    this._logger = loglevel.getLogger(`libantjs-${nextLoggerId++}`);

    Object.defineProperty(this, 'logging', {
      get() {
        return this._logging;
      },
      set(newValue) {
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

  _formatUint8Array(arg) {
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
  }

  trace() {
    this._logger.trace.apply(this._logger, arguments);
  }

  debug() {
    this._logger.debug.apply(this._logger, arguments);
  }

  info() {
    this._logger.info.apply(this._logger, arguments);
  }

  warn() {
    this._logger.warn.apply(this._logger, arguments);
  }

  error() {
    this._logger.error.apply(this._logger, arguments);
  }

  log(type) {
    const method = type === 'log' ? 'debug' : type;
    if (['trace', 'debug', 'info', 'warn', 'error'].includes(method)) {
      this[method].apply(this, Array.prototype.slice.call(arguments, 1));
    } else if (this.console && typeof this.console.warn === 'function') {
      this.console.warn(Date.now(), 'Unknown console function ' + type, arguments);
    }
  }

  setLevel(level) {
    this._logger.setLevel(level);
    this._logging = this._logger.getLevel() < this._logger.levels.SILENT;
  }

  getLevel() {
    return this._logger.getLevel();
  }

  changeConsole(newConsole) {
    if (newConsole)
      this.console = newConsole;
  }

  time(name) {
    if (this.logging && this.console && this.console.time)
      this.console.time(name);
  }

  timeEnd(name) {
    if (this.logging && this.console && this.console.timeEnd)
      this.console.timeEnd(name);
  }
}

export default Logger;
