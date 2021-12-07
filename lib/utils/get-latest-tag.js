'use strict';

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * Gets latest tag from provided package name.
 *
 * @param {string} name - Package name.
 * @returns {Promise<StandardOutput>} - Return latest version, if latest tag exists.
 * @throws {Error} - When package name is invalid.
 */
function getLatestTag(name) {
  return execAsync(`npm view ${name} dist-tags --json`);
}

/**
 * @typedef StandardOutput
 * @property {string} stdout - Standard output.
 * @property {string} stderr - Standard error.
 */
module.exports = getLatestTag;