#!/usr/bin/env node

'use strict';

const argv = require('minimist')(process.argv.slice(2));

const verifyDeps = require('../lib');
const { name } = require('../package.json');

/**
 * Runs verify dependencies.
 *
 * @throws Error
 */
async function run() {
  const autoUpgrade = argv['auto-upgrade'] || argv.u;
  try {
    await verifyDeps({ autoUpgrade, dir: process.cwd() });
    process.exit(0);
  } catch (err) {
    if (err instanceof Error) console.error(err.message);
    process.exit(1);
  }
}

if (argv.help) {
  console.log(
    [
      '',
      `Usage: ${name} [options]`,
      '',
      'Checks existing dependencies for available updates',
      '',
      'Options:',
      '--help             Display this help message and exit',
      '-u --auto-upgrade  Automatically run all suggested upgrades'
    ].join('\n')
  );
} else {
  run();
}
