'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const loglevel = require('loglevel');
const Logger = require('../util/logger');

test('Logger sends level methods through loglevel with timestamp and source', () => {
  const entries = [];
  const output = {};
  for (const method of ['log', 'info', 'warn', 'error']) {
    output[method] = (...args) => entries.push({ method, args });
  }

  const logger = new Logger({ log: true, logSource: 'TestSource' });
  logger.changeConsole(output);
  logger.debug('debug message');
  logger.info('info message');
  logger.warn('warn message');
  logger.error('error message');

  assert.deepEqual(entries.map(entry => entry.method), ['log', 'info', 'warn', 'error']);
  assert.match(entries[0].args[0], /^\d+ TestSource:$/);
  assert.equal(entries[0].args[1], 'debug message');
  assert.equal(entries[3].args[1], 'error message');
});

test('Logger can be disabled and re-enabled through its logging property', () => {
  const entries = [];
  const logger = new Logger(false);
  logger.changeConsole({ log: (...args) => entries.push(args) });

  logger.debug('hidden');
  logger.logging = true;
  logger.debug('visible');

  assert.equal(entries.length, 1);
  assert.equal(entries[0][1], 'visible');
});

test('Logger keeps the legacy log method mapped to debug', () => {
  const entries = [];
  const logger = new Logger(true);
  logger.changeConsole({ log: (...args) => entries.push(args) });

  logger.log('log', 'legacy message');

  assert.equal(entries[0][1], 'legacy message');
});

test('Logger supports changing the minimum log level', () => {
  const entries = [];
  const logger = new Logger(true);
  logger.changeConsole({
    log: (...args) => entries.push(args),
    info: (...args) => entries.push(args),
    warn: (...args) => entries.push(args),
    error: (...args) => entries.push(args)
  });

  logger.setLevel('warn');
  logger.debug('hidden debug');
  logger.info('hidden info');
  logger.warn('visible warning');

  assert.equal(logger.logging, true);
  assert.equal(logger.getLevel(), loglevel.levels.WARN);
  assert.equal(entries.length, 1);
  assert.equal(entries[0][1], 'visible warning');
});
