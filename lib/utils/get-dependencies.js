'use strict';

const path = require('path');

function getDependencies({ dir = '' }) {
  return require(path.join(dir, 'package.json'));
}

module.exports = getDependencies;
