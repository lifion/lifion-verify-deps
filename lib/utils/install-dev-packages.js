'use strict';

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * Installs provided NPM modules as development dependencies.
 *
 * @param {string} pkgs - list of packages.
 * @returns {Promise<StandardOutput>} - Standard output.
 */
async function installDevPackages(pkgs) {
  return execAsync(`npm i -D ${pkgs}`);
}

/**
 * @typedef StandardOutput
 * @property {string} stdout - Standard output.
 * @property {string} stderr - Standard error.
 */

module.exports = installDevPackages;
