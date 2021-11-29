'use strict';

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);
/**
 *
 * Gets available versions for provided package name.
 *
 * @param {string} name - Package name.
 * @returns {Promise<StandardOutput>} - List of available versions.
 * @throws {Error} - Output failed JSON parse.
 */
async function getLatestVersions(name) {
  return execAsync(`npm view ${name} versions --json`);
}

/**
 * @typedef StandardOutput
 * @property {string} stdout - Standard output.
 * @property {string} stderr - Standard error.
 */

module.exports = getLatestVersions;
