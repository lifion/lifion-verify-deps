'use strict';

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function installPackages(pkgs) {
  return execAsync(`npm i ${pkgs}`);
}

module.exports = installPackages;
