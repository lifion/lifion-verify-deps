'use strict';

const verifyDeps = require('.');

describe('verifyDeps', () => {
  it('exports as a function', () => {
    expect(typeof verifyDeps).toBe('function');
  });
});
