'use strict';

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

async function installDevPackages(pkgs) {
  return execAsync(`npm i -D ${pkgs}`);
}

module.exports = installDevPackages;
