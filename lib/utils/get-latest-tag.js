'use strict';

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * Gets latest tag from provided package name.
 *
 * @param {string} name - Package name.
 * @returns {Promise<string>} - Return latest version, if latest tag exists.
 * @throws {Error} - Output failed JSON parse.
 */
async function getLatestTag(name) {
  return await execAsync(`npm view ${name} dist-tags --json`);
}

module.exports = getLatestTag;
