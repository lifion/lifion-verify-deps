'use strict';

const path = require('path');

/**
 * Gets currently installed version for provided package name.
 *
 * @param {string} currentDir - Path to package.json directory.
 * @param {string} name - Package name.
 * @returns {string | null} - Installed version or null if not installed.
 * @throws {Error} - Unable to find installed versions, try installing node modules by running `npm i`.
 */
function getInstalledVersion(currentDir, name) {
  return require(path.join(currentDir, 'node_modules', name, 'package.json'));
}

module.exports = getInstalledVersion;
