#!/usr/bin/env node

'use strict';

const argv = require('minimist')(process.argv.slice(2));
const verifyDeps = require('../lib');

if (argv.help) {
  console.log(
    [
      '',
      'Usage: lifion-verify-deps [options]',
      '',
      'Checks existing dependencies for available updates',
      '',
      'Options:',
      '--help           Display this help message and exit',
      '--auto_upgrade    Automatically run all suggested upgrades'
    ].join('\n')
  );
}

async function run() {
  const { auto_upgrade: autoUpgrade } = argv;
  try {
    await verifyDeps({ autoUpgrade, dir: process.cwd() });
    process.exit(0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

run();
