'use strict';

const path = require('path');

/**
 * Gets contents of package.json.
 *
 * @param {Object} obj -
 * @param {string} [obj.dir=''] - Path to directory.
 * @returns {PackageJson} - Contects of package.json from the provided directory.
 */
function getDependencies({ dir = '' }) {
  return require(path.join(dir, 'package.json'));
}

/**
 * @typedef PackageJson
 * @property {Object} dependencies - Production dependencies.
 * @property {Object} devDependencies - Development dependencies.
 */

module.exports = getDependencies;
