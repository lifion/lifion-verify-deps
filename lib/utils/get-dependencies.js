'use strict';

const path = require('path');

/**
 * Gets contents of package.json.
 *
 * @param {Object} obj - Object with parameters.
 * @param {string} [obj.dir=''] - Path to directory.
 * @returns {PackageJson} - Contects of package.json from the provided directory.
 * @throws {Error} - When unable to find package.json.
 */
function getDependencies({ dir = '' }) {
  return require(path.join(dir, 'package.json'));
}

/**
 * @typedef PackageJson
 * @property {Object.<string, string>} dependencies - Production dependencies.
 * @property {Object.<string, string>} devDependencies - Development dependencies.
 */

module.exports = getDependencies;
