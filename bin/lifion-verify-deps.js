#!/usr/bin/env node

'use strict';

const verifyDeps = require('../lib');

async function run() {
  try {
    await verifyDeps({ dir: process.cwd() });
    process.exit(0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
}

run();
