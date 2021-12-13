'use strict';

const { exec } = require('child_process');
const { promisify } = require('util');

const execPromise = promisify(exec);

const execp = (cmd = '') => {
  return execPromise(cmd);
};

const requireModule = (path = '') => {
  return require(path);
};

module.exports = { execp, requireModule };
