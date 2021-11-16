'use strict';

const { promisify: getMockExecAsync } = require('util');
// const path = require('path');

const verifyDeps = require('.');

jest.mock('child_process', () => ({}));
jest.mock('util', () => {
  const mockExecAsync = jest.fn();
  return { promisify: () => mockExecAsync };
});
jest.mock('chalk', () => ({
  blue: (str) => str,
  bold: (str) => str,
  green: (str) => str,
  red: (str) => str
}));

// const { join: mockJoin } = path;
// jest.mock('path', () => ({ join: jest.fn() }));

const mockExecAsync = getMockExecAsync();

describe('lib/index', () => {
  const logger = { info: jest.fn() };

  afterEach(() => {
    logger.info.mockClear();
    mockExecAsync.mockClear();
  });

  test('should upgrade upto patch versions when versions prefixed with ~', async () => {
    const dir = 'dir1';
    // jest.mock(
    //   `dir1/package.json`,
    //   () => ({ dependencies: { foo1: '~46.45.44' }, devDependencies: {} }),
    //   { virtual: true }
    // );
    // jest.mock('dir1/node_modules/foo1/package.json', () => ({ version: '46.45.44' }), {
    //   virtual: true
    // });

    // mockJoin.mockImplementationOnce((...args) => {
    //   console.warn('args:', args);
    //   if (args[0] === 'dir1' && args[1] === 'package.json') {
    //     return {
    //       module.exports = {
    //         dependencies: { foo1: '~46.45.44' },
    //         devDependencies: {}}
    //     };
    //   }
    //   throw new Error('something is wrong');
    // });
    mockExecAsync
      .mockImplementationOnce(() =>
        Promise.resolve({ stdout: JSON.stringify(['46.45.45', '46.46.0']) })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({ stdout: JSON.stringify({ latest: '46.46.0' }) })
      );
    await expect(verifyDeps({ dir, logger })).rejects.toThrow(
      'Please update your installed modules'
    );
    // console.warn(logger.info.mock.calls);
    expect(logger.info).toHaveBeenCalledTimes(4);
    expect(logger.info).toHaveBeenNthCalledWith(1, 'Verifying dependencies…\n');
    expect(logger.info).toHaveBeenNthCalledWith(2, 'foo1 is outdated: 46.45.44 → 46.45.45');
    expect(logger.info).toHaveBeenNthCalledWith(3, '\nTo resolve this, run:');
    expect(logger.info).toHaveBeenNthCalledWith(4, 'npm i foo1@46.45.45 ');
  });

  // test('should upgrade upto minor versions when versions prefixed with ^', async () => {
  //   const dir = 'dir2';
  //   jest.mock(
  //     `dir2/package.json`,
  //     () => ({ dependencies: { foo1: '^46.45.44' }, devDependencies: {} }),
  //     { virtual: true }
  //   );
  //   jest.mock('dir2/node_modules/foo1/package.json', () => ({ version: '46.45.44' }), {
  //     virtual: true
  //   });
  //   mockExecAsync
  //     .mockImplementationOnce(() =>
  //       Promise.resolve({ stdout: JSON.stringify(['46.45.45', '46.46.0']) })
  //     )
  //     .mockImplementationOnce(() =>
  //       Promise.resolve({ stdout: JSON.stringify({ latest: '46.46.0' }) })
  //     );
  //   await expect(verifyDeps({ dir, logger })).rejects.toThrow(
  //     'Please update your installed modules'
  //   );
  //   expect(logger.info).toHaveBeenCalledTimes(4);
  //   expect(logger.info).toHaveBeenNthCalledWith(1, 'Verifying dependencies…\n');
  //   expect(logger.info).toHaveBeenNthCalledWith(2, 'foo1 is outdated: 46.45.44 → 46.46.0');
  //   expect(logger.info).toHaveBeenNthCalledWith(3, '\nTo resolve this, run:');
  //   expect(logger.info).toHaveBeenNthCalledWith(4, 'npm i foo1@46.46.0 ');
  // });

  // test('should not upgrade locked versions', async () => {
  //   const dir = 'dir3';
  //   jest.mock(
  //     `dir3/package.json`,
  //     () => ({ dependencies: { foo1: '46.45.44' }, devDependencies: {} }),
  //     { virtual: true }
  //   );
  //   jest.mock('dir3/node_modules/foo1/package.json', () => ({ version: '46.45.44' }), {
  //     virtual: true
  //   });
  //   await expect(verifyDeps({ dir, logger })).resolves.toBeUndefined();
  //   expect(logger.info).toHaveBeenCalledTimes(2);
  //   expect(logger.info).toHaveBeenNthCalledWith(1, 'Verifying dependencies…\n');
  //   expect(logger.info).toHaveBeenNthCalledWith(2, 'All NPM modules are up to date.');
  // });

  // test('should compare installed dependencies to latest NPM versions', async () => {
  //   const dir = 'dir4';
  //   jest.mock(
  //     `dir4/package.json`,
  //     () => ({ dependencies: { jugageni: '^1.0.0' }, devDependencies: {} }),
  //     { virtual: true }
  //   );
  //   jest.mock('dir4/node_modules/jugageni/package.json', () => ({ version: '1.0.0' }), {
  //     virtual: true
  //   });
  //   mockExecAsync
  //     .mockImplementationOnce(() => Promise.resolve({ stdout: JSON.stringify(['1.0.0', '1.0.1']) }))
  //     .mockImplementationOnce(() =>
  //       Promise.resolve({ stdout: JSON.stringify({ latest: '1.0.1' }) })
  //     );
  //   await expect(verifyDeps({ dir, logger })).rejects.toThrow(
  //     'Please update your installed modules.'
  //   );
  //   expect(mockExecAsync).toHaveBeenCalledWith(`npm view jugageni versions --json`);
  //   expect(mockExecAsync).toHaveBeenCalledWith(`npm view jugageni dist-tags --json`);
  // });

  // test('should compare installed devDpendencies to latest NPM versions', async () => {
  //   const dir = 'dir5';
  //   jest.mock(
  //     `dir5/package.json`,
  //     () => ({ dependencies: {}, devDependencies: { jugageni: '^1.0.0' } }),
  //     { virtual: true }
  //   );
  //   jest.mock('dir5/node_modules/jugageni/package.json', () => ({ version: '1.0.0' }), {
  //     virtual: true
  //   });
  //   mockExecAsync
  //     .mockImplementationOnce(() => Promise.resolve({ stdout: JSON.stringify(['1.0.0', '1.0.1']) }))
  //     .mockImplementationOnce(() =>
  //       Promise.resolve({ stdout: JSON.stringify({ latest: '1.0.1' }) })
  //     );
  //   await expect(verifyDeps({ dir, logger })).rejects.toThrow(
  //     'Please update your installed modules.'
  //   );
  //   expect(mockExecAsync).toHaveBeenCalledWith(`npm view jugageni versions --json`);
  //   expect(mockExecAsync).toHaveBeenCalledWith(`npm view jugageni dist-tags --json`);
  // });

  // test('should show dependency update required when using semver and later version in range is available', async () => {
  //   const dir = 'dir6';
  //   jest.mock(
  //     `dir6/package.json`,
  //     () => ({ dependencies: { suji: '^1.0.0' }, devDependencies: { ju: '^1.0.0' } }),
  //     { virtual: true }
  //   );
  //   jest.mock('dir6/node_modules/suji/package.json', () => ({ version: '1.0.0' }), {
  //     virtual: true
  //   });
  //   jest.mock('dir6/node_modules/ju/package.json', () => ({ version: '1.0.0' }), {
  //     virtual: true
  //   });

  //   mockExecAsync
  //     .mockImplementationOnce(() => Promise.resolve({ stdout: JSON.stringify(['1.0.0', '1.0.1']) }))
  //     .mockImplementationOnce(() => Promise.resolve({ stdout: JSON.stringify(['1.0.0', '1.0.1']) }))
  //     .mockImplementationOnce(() =>
  //       Promise.resolve({ stdout: JSON.stringify({ latest: '1.0.1' }) })
  //     )
  //     .mockImplementationOnce(() =>
  //       Promise.resolve({ stdout: JSON.stringify({ latest: '1.0.1' }) })
  //     );
  //   await expect(verifyDeps({ dir, logger })).rejects.toThrow(
  //     'Please update your installed modules.'
  //   );
  //   expect(logger.info).toHaveBeenCalledTimes(5);
  //   expect(logger.info).toHaveBeenNthCalledWith(1, 'Verifying dependencies…\n');
  //   expect(logger.info).toHaveBeenNthCalledWith(2, `suji is outdated: 1.0.0 → 1.0.1`);
  //   expect(logger.info).toHaveBeenNthCalledWith(3, `ju is outdated: 1.0.0 → 1.0.1`);
  //   expect(logger.info).toHaveBeenNthCalledWith(4, `\n${'To resolve this, run:'}`);
  //   expect(logger.info).toHaveBeenNthCalledWith(5, `npm i suji@1.0.1 \nnpm i -D ju@1.0.1 `);
  // });

  // test('should not show dependency update required when using semver and later version is out of range', async () => {
  //   const dir = 'dir7';
  //   jest.mock(
  //     `dir7/package.json`,
  //     () => ({ dependencies: {}, devDependencies: { mi: '^1.0.0' } }),
  //     { virtual: true }
  //   );
  //   jest.mock('dir7/node_modules/mi/package.json', () => ({ version: '1.0.0' }), {
  //     virtual: true
  //   });
  //   mockExecAsync
  //     .mockImplementationOnce(() => Promise.resolve({ stdout: JSON.stringify(['1.0.0', '2.0.0']) }))
  //     .mockImplementationOnce(() =>
  //       Promise.resolve({ stdout: JSON.stringify({ latest: '1.0.0' }) })
  //     );
  //   await verifyDeps({ dir, logger });
  //   expect(logger.info).toHaveBeenCalledTimes(2);
  //   expect(logger.info).toHaveBeenNthCalledWith(1, 'Verifying dependencies…\n');
  //   expect(logger.info).toHaveBeenNthCalledWith(2, 'All NPM modules are up to date.');
  // });

  // test('should show dependency update required when version is locked if non-major-version update available', async () => {
  //   const dir = 'dir8';
  //   jest.mock(
  //     `dir8/package.json`,
  //     () => ({
  //       dependencies: { fu: '^1.0.0', lezejujuk: '^1.0.0' },
  //       devDependencies: { kuvrib: '^1.0.0', voliki: '^1.0.0' }
  //     }),
  //     { virtual: true }
  //   );
  //   jest.mock('dir8/node_modules/fu/package.json', () => ({ version: '1.0.0' }), { virtual: true });
  //   jest.mock('dir8/node_modules/lezejujuk/package.json', () => ({ version: '1.0.0' }), {
  //     virtual: true
  //   });
  //   jest.mock('dir8/node_modules/kuvrib/package.json', () => ({ version: '1.0.0' }), {
  //     virtual: true
  //   });
  //   jest.mock('dir8/node_modules/voliki/package.json', () => ({ version: '1.0.0' }), {
  //     virtual: true
  //   });
  //   mockExecAsync
  //     .mockImplementationOnce(() => Promise.resolve({ stdout: JSON.stringify(['1.0.0']) }))
  //     .mockImplementationOnce(() => Promise.resolve({ stdout: JSON.stringify(['1.0.0', '1.1.0']) }))
  //     .mockImplementationOnce(() => Promise.resolve({ stdout: JSON.stringify(['1.0.0']) }))
  //     .mockImplementationOnce(() => Promise.resolve({ stdout: JSON.stringify(['1.0.0', '1.1.0']) }))
  //     .mockImplementationOnce(() =>
  //       Promise.resolve({ stdout: JSON.stringify({ latest: '1.0.0' }) })
  //     )
  //     .mockImplementationOnce(() =>
  //       Promise.resolve({ stdout: JSON.stringify({ latest: '1.1.0' }) })
  //     )
  //     .mockImplementationOnce(() =>
  //       Promise.resolve({ stdout: JSON.stringify({ latest: '1.0.0' }) })
  //     )
  //     .mockImplementationOnce(() =>
  //       Promise.resolve({ stdout: JSON.stringify({ latest: '1.1.0' }) })
  //     );
  //   await expect(verifyDeps({ dir, logger })).rejects.toThrow(
  //     'Please update your installed modules.'
  //   );
  //   expect(logger.info).toHaveBeenCalledTimes(5);
  //   expect(logger.info).toHaveBeenNthCalledWith(1, 'Verifying dependencies…\n');
  //   expect(logger.info).toHaveBeenNthCalledWith(2, `lezejujuk is outdated: 1.0.0 → 1.1.0`);
  //   expect(logger.info).toHaveBeenNthCalledWith(3, `voliki is outdated: 1.0.0 → 1.1.0`);
  //   expect(logger.info).toHaveBeenNthCalledWith(4, `\n${'To resolve this, run:'}`);
  //   expect(logger.info).toHaveBeenNthCalledWith(
  //     5,
  //     `npm i lezejujuk@1.1.0 \nnpm i -D voliki@1.1.0 `
  //   );
  // });

  // test('should not show dependency update required when version is locked if major-version update available', async () => {
  //   const dir = 'dir9';
  //   jest.mock(
  //     `dir9/package.json`,
  //     () => ({
  //       dependencies: { an: '^1.0.0' },
  //       devDependencies: { pu: '^1.0.0' }
  //     }),
  //     { virtual: true }
  //   );
  //   jest.mock('dir9/node_modules/an/package.json', () => ({ version: '1.0.0' }), {
  //     virtual: true
  //   });
  //   jest.mock('dir9/node_modules/pu/package.json', () => ({ version: '1.0.0' }), {
  //     virtual: true
  //   });

  //   mockExecAsync
  //     .mockImplementationOnce(() => Promise.resolve({ stdout: JSON.stringify(['1.0.0', '2.0.0']) }))
  //     .mockImplementationOnce(() => Promise.resolve({ stdout: JSON.stringify(['1.0.0', '2.0.0']) }))
  //     .mockImplementationOnce(() =>
  //       Promise.resolve({ stdout: JSON.stringify({ latest: '2.0.0' }) })
  //     )
  //     .mockImplementationOnce(() =>
  //       Promise.resolve({ stdout: JSON.stringify({ latest: '2.0.0' }) })
  //     );
  //   await verifyDeps({ dir, logger });
  //   expect(logger.info).toHaveBeenCalledTimes(2);
  //   expect(logger.info).toHaveBeenNthCalledWith(1, 'Verifying dependencies…\n');
  //   expect(logger.info).toHaveBeenCalledWith('All NPM modules are up to date.');
  // });

  // test('should show dependency install required if module cannot be found', async () => {
  //   const dir = 'dir10';
  //   jest.mock(
  //     `dir10/package.json`,
  //     () => ({ dependencies: { eri: '^1.0.0' }, devDependencies: { ok: '^1.0.0' } }),
  //     { virtual: true }
  //   );
  //   jest.mock('dir10/node_modules/unapup/package.json', () => ({ version: '1.0.0' }), {
  //     virtual: true
  //   });
  //   jest.mock('dir10/node_modules/ok/package.json', () => ({ version: '1.0.0' }), {
  //     virtual: true
  //   });
  //   jest.mock('dir10/node_modules/zousga/package.json', () => ({ version: '1.0.0' }), {
  //     virtual: true
  //   });
  //   mockExecAsync
  //     .mockImplementationOnce(() => Promise.resolve({ stdout: JSON.stringify(['1.0.0', '1.0.1']) }))
  //     .mockImplementationOnce(() => Promise.resolve({ stdout: JSON.stringify(['1.0.0', '1.0.1']) }))
  //     .mockImplementationOnce(() =>
  //       Promise.resolve({ stdout: JSON.stringify({ latest: '1.0.1' }) })
  //     )
  //     .mockImplementationOnce(() =>
  //       Promise.resolve({ stdout: JSON.stringify({ latest: '1.0.1' }) })
  //     );
  //   await expect(verifyDeps({ dir, logger })).rejects.toThrow(
  //     'Please update your installed modules.'
  //   );
  //   expect(logger.info).toHaveBeenCalledTimes(6);
  //   expect(logger.info).toHaveBeenNthCalledWith(1, 'Verifying dependencies…\n');
  //   expect(logger.info).toHaveBeenNthCalledWith(
  //     2,
  //     "Error getting a list of installed modules from package.json - Error: Cannot find module 'dir10/node_modules/eri/package.json' from 'index.js'"
  //   );
  //   expect(logger.info).toHaveBeenNthCalledWith(3, `eri is not installed`);
  //   expect(logger.info).toHaveBeenNthCalledWith(4, `ok is outdated: 1.0.0 → 1.0.1`);
  //   expect(logger.info).toHaveBeenNthCalledWith(5, `\nTo resolve this, run:`);
  //   expect(logger.info).toHaveBeenNthCalledWith(6, `npm i eri@1.0.1 \nnpm i -D ok@1.0.1 `);
  // });

  // test('should show dependency install required if fetching versions does not return valid JSON output', async () => {
  //   const dir = 'dir11';
  //   jest.mock(`dir11/package.json`, () => ({ dependencies: { kita: '^1.0.0' } }), {
  //     virtual: true
  //   });
  //   jest.mock('dir11/node_modules/kita/package.json', () => ({ version: '1.0.0' }), {
  //     virtual: true
  //   });
  //   const invalidOutput = 'boo';
  //   mockExecAsync.mockImplementationOnce(() => ({ stdout: invalidOutput }));
  //   let syntaxError;
  //   try {
  //     JSON.parse(invalidOutput);
  //   } catch (err) {
  //     syntaxError = err;
  //   }
  //   await expect(verifyDeps({ dir, logger })).rejects.toThrow(
  //     `Failed to parse output from NPM view when getting versions - ${syntaxError.toString()}`
  //   );
  // });

  // test('should show dependency install required if fetching tags does not return valid JSON output', async () => {
  //   const dir = 'dir12';
  //   jest.mock(`dir12/package.json`, () => ({ dependencies: { mks: '^1.0.0' } }), {
  //     virtual: true
  //   });
  //   jest.mock('dir12/node_modules/mks/package.json', () => ({ version: '1.0.0' }), {
  //     virtual: true
  //   });
  //   const invalidOutput = 'boo';
  //   mockExecAsync
  //     .mockImplementationOnce(() =>
  //       Promise.resolve({ stdout: JSON.stringify({ stdout: JSON.stringify(['1.0.0', '1.0.1']) }) })
  //     )
  //     .mockImplementationOnce(() => ({ stdout: invalidOutput }));
  //   let syntaxError;
  //   try {
  //     JSON.parse(invalidOutput);
  //   } catch (err) {
  //     syntaxError = err;
  //   }
  //   await expect(verifyDeps({ dir, logger })).rejects.toThrow(
  //     `Failed to parse output from NPM view when getting tags - ${syntaxError.toString()}`
  //   );
  // });

  // test('throw error when getting latest versions fails', async () => {
  //   const dir = 'dir13';
  //   jest.mock(`dir13/package.json`, () => ({ dependencies: { tans: '^1.0.0' } }), {
  //     virtual: true
  //   });
  //   jest.mock('dir12/node_modules/tans/package.json', () => ({ version: '1.0.0' }), {
  //     virtual: true
  //   });
  //   mockExecAsync.mockImplementation(() => {
  //     throw new Error('foo');
  //   });
  //   await expect(verifyDeps({ dir, logger })).rejects.toThrow(
  //     `Error getting latest versions - Error: foo`
  //   );
  // });

  // test('throw error when getting latest tag fails', async () => {
  //   const dir = 'dir14';
  //   jest.mock(`dir14/package.json`, () => ({ dependencies: { utex: '^1.0.0' } }), {
  //     virtual: true
  //   });
  //   jest.mock('dir14/node_modules/utex/package.json', () => ({ version: '1.0.0' }), {
  //     virtual: true
  //   });
  //   mockExecAsync
  //     .mockImplementationOnce(() =>
  //       Promise.resolve({ stdout: JSON.stringify({ stdout: JSON.stringify(['1.0.0', '1.0.1']) }) })
  //     )
  //     .mockImplementationOnce(() => {
  //       throw new Error('boo');
  //     });
  //   await expect(verifyDeps({ dir, logger })).rejects.toThrow(
  //     `Error getting latest tag - Error: boo`
  //   );
  // });

  // test('should show dependency install required if latest module is installed but not reflected in package.json', async () => {
  //   const dir = 'dir15';
  //   jest.mock(
  //     `dir15/package.json`,
  //     () => ({ dependencies: { lule: '^1.0.0' }, devDependencies: { neh: '^1.0.0' } }),
  //     { virtual: true }
  //   );
  //   jest.mock('dir15/node_modules/lule/package.json', () => ({ version: '1.0.1' }), {
  //     virtual: true
  //   });
  //   jest.mock('dir15/node_modules/neh/package.json', () => ({ version: '1.0.1' }), {
  //     virtual: true
  //   });
  //   mockExecAsync
  //     .mockImplementationOnce(() => Promise.resolve({ stdout: JSON.stringify(['1.0.0', '1.0.1']) }))
  //     .mockImplementationOnce(() => Promise.resolve({ stdout: JSON.stringify(['1.0.0', '1.0.1']) }))
  //     .mockImplementationOnce(() =>
  //       Promise.resolve({ stdout: JSON.stringify({ latest: '1.0.1' }) })
  //     )
  //     .mockImplementationOnce(() =>
  //       Promise.resolve({ stdout: JSON.stringify({ latest: '1.0.1' }) })
  //     );
  //   await expect(verifyDeps({ dir, logger })).rejects.toThrow(
  //     'Please update your installed modules.'
  //   );
  //   expect(logger.info).toHaveBeenCalledTimes(5);
  //   expect(logger.info).toHaveBeenNthCalledWith(1, 'Verifying dependencies…\n');
  //   expect(logger.info).toHaveBeenNthCalledWith(2, `lule is outdated: 1.0.0 → 1.0.1`);
  //   expect(logger.info).toHaveBeenNthCalledWith(3, `neh is outdated: 1.0.0 → 1.0.1`);
  //   expect(logger.info).toHaveBeenNthCalledWith(4, `\n${'To resolve this, run:'}`);
  //   expect(logger.info).toHaveBeenNthCalledWith(5, `npm i lule@1.0.1 \nnpm i -D neh@1.0.1 `);
  // });

  // test('should not throw an error if no dependencies are in package.json', async () => {
  //   const dir = 'dir16';
  //   jest.mock(
  //     `dir16/package.json`,
  //     () => ({ dependencies: undefined, devDependencies: undefined }),
  //     { virtual: true }
  //   );
  //   await verifyDeps({ dir, logger });
  //   expect(logger.info).toHaveBeenCalledTimes(2);
  //   expect(logger.info).toHaveBeenNthCalledWith(1, 'Verifying dependencies…\n');
  //   expect(logger.info).toHaveBeenNthCalledWith(2, 'All NPM modules are up to date.');
  // });

  // test('should default to native console when no logger is passed', async () => {
  //   const consoleInfo = console.info;
  //   console.info = jest.fn();
  //   const dir = 'dir17';
  //   jest.mock(
  //     `dir17/package.json`,
  //     () => ({ dependencies: { eri: '^1.0.0' }, devDependencies: { ok: '^1.0.0' } }),
  //     { virtual: true }
  //   );
  //   jest.mock('dir17/node_modules/eri/package.json', () => ({ version: '1.0.0' }), {
  //     virtual: true
  //   });
  //   jest.mock('dir17/node_modules/ok/package.json', () => ({ version: '1.0.0' }), {
  //     virtual: true
  //   });
  //   mockExecAsync
  //     .mockImplementationOnce(() => Promise.resolve({ stdout: JSON.stringify(['1.0.0', '1.0.1']) }))
  //     .mockImplementationOnce(() => Promise.resolve({ stdout: JSON.stringify(['1.0.0', '1.0.1']) }))
  //     .mockImplementationOnce(() =>
  //       Promise.resolve({ stdout: JSON.stringify({ latest: '1.0.1' }) })
  //     )
  //     .mockImplementationOnce(() =>
  //       Promise.resolve({ stdout: JSON.stringify({ latest: '1.0.1' }) })
  //     );
  //   await expect(verifyDeps({ dir })).rejects.toThrow('Please update your installed modules.');
  //   expect(console.info).toHaveBeenCalledTimes(5);
  //   expect(console.info).toHaveBeenNthCalledWith(1, 'Verifying dependencies…\n');
  //   expect(console.info).toHaveBeenNthCalledWith(2, `eri is outdated: 1.0.0 → 1.0.1`);
  //   expect(console.info).toHaveBeenNthCalledWith(3, `ok is outdated: 1.0.0 → 1.0.1`);
  //   expect(console.info).toHaveBeenNthCalledWith(4, `\n${'To resolve this, run:'}`);
  //   expect(console.info).toHaveBeenNthCalledWith(5, `npm i eri@1.0.1 \nnpm i -D ok@1.0.1 `);
  //   console.info = consoleInfo;
  // });

  // test('should not throw type error if options are not passed', async () => {
  //   jest.mock(`package.json`, () => ({ dependencies: { eri: '^1.0.0' } }), {
  //     virtual: true
  //   });
  //   jest.mock('node_modules/eri/package.json', () => ({ version: '1.0.0' }), {
  //     virtual: true
  //   });
  //   mockExecAsync
  //     .mockImplementationOnce(() => Promise.resolve({ stdout: JSON.stringify(['1.0.0', '1.0.1']) }))
  //     .mockImplementationOnce(() =>
  //       Promise.resolve({ stdout: JSON.stringify({ latest: '1.0.1' }) })
  //     );
  //   const consoleInfo = console.info;
  //   console.info = jest.fn();
  //   await expect(verifyDeps()).rejects.toThrow('Please update your installed modules.');
  //   console.info = consoleInfo;
  // });

  // test('should update to version aliased as latest when aliased latest is less that most recent published version', async () => {
  //   const dir = 'dir19';
  //   jest.mock(
  //     `dir19/package.json`,
  //     () => ({ dependencies: { foo1: '^1.2.3' }, devDependencies: { fooDev1: '^1.2.3' } }),
  //     { virtual: true }
  //   );
  //   jest.mock('dir19/node_modules/foo1/package.json', () => ({ version: '1.2.3' }), {
  //     virtual: true
  //   });
  //   jest.mock('dir19/node_modules/fooDev1/package.json', () => ({ version: '1.2.3' }), {
  //     virtual: true
  //   });
  //   mockExecAsync
  //     .mockImplementationOnce(() => Promise.resolve({ stdout: JSON.stringify(['1.2.4', '1.2.5']) }))
  //     .mockImplementationOnce(() => Promise.resolve({ stdout: JSON.stringify(['1.2.4', '1.2.5']) }))
  //     .mockImplementationOnce(() =>
  //       Promise.resolve({ stdout: JSON.stringify({ latest: '1.2.4' }) })
  //     )
  //     .mockImplementationOnce(() =>
  //       Promise.resolve({ stdout: JSON.stringify({ latest: '1.2.4' }) })
  //     )
  //     .mockImplementationOnce(() => Promise.resolve({ stdout: 'foo1@1.2.4' }))
  //     .mockImplementationOnce(() => Promise.resolve({ stdout: 'fooDev1@1.2.4' }));
  //   await verifyDeps({ autoUpgrade: true, dir, logger });
  //   expect(logger.info).toHaveBeenCalledTimes(7);
  //   expect(logger.info).toHaveBeenNthCalledWith(1, 'Verifying dependencies…\n');
  //   expect(logger.info).toHaveBeenNthCalledWith(2, `foo1 is outdated: 1.2.3 → 1.2.4`);
  //   expect(logger.info).toHaveBeenNthCalledWith(3, `fooDev1 is outdated: 1.2.3 → 1.2.4`);
  //   expect(logger.info).toHaveBeenNthCalledWith(4, 'UPGRADING…');
  //   expect(logger.info).toHaveBeenNthCalledWith(5, `npm i foo1@1.2.4 \nnpm i -D fooDev1@1.2.4 `);
  //   expect(logger.info).toHaveBeenNthCalledWith(6, `Upgraded dependencies:\nfoo1@1.2.4`);
  //   expect(logger.info).toHaveBeenNthCalledWith(
  //     7,
  //     `Upgraded development dependencies:\nfooDev1@1.2.4`
  //   );
  // });

  // test('should upgrade pre-release versions to latest pre-release version available', async () => {
  //   const dir = 'dir20';
  //   jest.mock(
  //     `dir20/package.json`,
  //     () => ({ dependencies: { foo1: '^1.0.0-alpha.0' }, devDependencies: {} }),
  //     { virtual: true }
  //   );
  //   jest.mock('dir20/node_modules/foo1/package.json', () => ({ version: '1.0.0-alpha.0' }), {
  //     virtual: true
  //   });
  //   mockExecAsync
  //     .mockImplementationOnce(() =>
  //       Promise.resolve({ stdout: JSON.stringify(['1.0.0-alpha.1', '1.0.0-alpha.2', '1.2.4']) })
  //     )
  //     .mockImplementationOnce(() =>
  //       Promise.resolve({ stdout: JSON.stringify({ latest: '1.2.4' }) })
  //     );
  //   await expect(verifyDeps({ dir, logger })).rejects.toThrow(
  //     'Please update your installed modules.'
  //   );
  //   expect(logger.info).toHaveBeenCalledTimes(4);
  //   expect(logger.info).toHaveBeenNthCalledWith(1, 'Verifying dependencies…\n');
  //   expect(logger.info).toHaveBeenNthCalledWith(
  //     2,
  //     `foo1 is outdated: 1.0.0-alpha.0 → 1.0.0-alpha.2`
  //   );
  //   expect(logger.info).toHaveBeenNthCalledWith(3, '\nTo resolve this, run:');
  //   expect(logger.info).toHaveBeenNthCalledWith(4, `npm i foo1@1.0.0-alpha.2 `);
  // });

  // test('should not upgrade when no version available for major version of pre-release', async () => {
  //   const dir = 'dir21';
  //   jest.mock(
  //     `dir21/package.json`,
  //     () => ({ dependencies: { foo1: '^1.0.0-alpha.0' }, devDependencies: {} }),
  //     { virtual: true }
  //   );
  //   jest.mock('dir21/node_modules/foo1/package.json', () => ({ version: '1.0.0-alpha.0' }), {
  //     virtual: true
  //   });
  //   mockExecAsync
  //     .mockImplementationOnce(() => {
  //       return Promise.resolve({
  //         stdout: JSON.stringify([
  //           '0.0.0-alpha.0',
  //           '1.0.0-alpha.0',
  //           '1.2.4',
  //           '1.2.5',
  //           '2.0.0-alpha.0'
  //         ])
  //       });
  //     })
  //     .mockImplementationOnce(() => {
  //       return Promise.resolve({ stdout: JSON.stringify({ latest: '1.2.5' }) });
  //     });
  //   await verifyDeps({ dir, logger });
  //   expect(logger.info).toHaveBeenCalledTimes(2);
  //   expect(logger.info).toHaveBeenNthCalledWith(1, 'Verifying dependencies…\n');
  //   expect(logger.info).toHaveBeenNthCalledWith(2, `All NPM modules are up to date.`);
  // });

  // test('should throw an error when version in package.json is invalid (likely unpublished)', async () => {
  //   const dir = 'dir22';
  //   jest.mock(
  //     `dir22/package.json`,
  //     () => ({ dependencies: { foo1: '^1.2.4' }, devDependencies: {} }),
  //     { virtual: true }
  //   );
  //   jest.mock('dir22/node_modules/foo1/package.json', () => ({ version: '1.2.4' }), {
  //     virtual: true
  //   });
  //   mockExecAsync
  //     .mockImplementationOnce(() => Promise.resolve({ stdout: JSON.stringify(['1.0.0', '1.2.1']) }))
  //     .mockImplementationOnce(() =>
  //       Promise.resolve({ stdout: JSON.stringify({ latest: '1.2.1' }) })
  //     );
  //   const error = new Error(
  //     `Current version of foo1:^1.2.4 seems to be invalid. The version was likely unpublished. Please manually upgrade to a valid version and re-run this application.`
  //   );
  //   await expect(verifyDeps({ autoUpgrade: true, dir, logger })).rejects.toEqual(error);
  // });

  // test('autoUpgrade modules', async () => {
  //   const dir = 'dir23';
  //   jest.mock(
  //     `dir23/package.json`,
  //     () => ({ dependencies: { oli: '^1.0.0' }, devDependencies: { barda: '^1.0.0' } }),
  //     { virtual: true }
  //   );
  //   jest.mock('dir23/node_modules/oli/package.json', () => ({ version: '1.0.0' }), {
  //     virtual: true
  //   });
  //   jest.mock('dir23/node_modules/barda/package.json', () => ({ version: '1.0.0' }), {
  //     virtual: true
  //   });
  //   mockExecAsync
  //     .mockImplementationOnce(() => Promise.resolve({ stdout: JSON.stringify(['1.0.0', '1.0.1']) }))
  //     .mockImplementationOnce(() => Promise.resolve({ stdout: JSON.stringify(['1.0.0', '1.0.1']) }))
  //     .mockImplementationOnce(() =>
  //       Promise.resolve({ stdout: JSON.stringify({ latest: '1.0.1' }) })
  //     )
  //     .mockImplementationOnce(() =>
  //       Promise.resolve({ stdout: JSON.stringify({ latest: '1.0.1' }) })
  //     )
  //     .mockImplementationOnce(() => Promise.resolve({ stdout: 'oli@1.0.1' }))
  //     .mockImplementationOnce(() => Promise.resolve({ stdout: 'barda@1.0.1' }));
  //   await verifyDeps({ autoUpgrade: true, dir, logger });
  //   expect(logger.info).toHaveBeenCalledTimes(7);
  //   expect(logger.info).toHaveBeenNthCalledWith(1, 'Verifying dependencies…\n');
  //   expect(logger.info).toHaveBeenNthCalledWith(2, `oli is outdated: 1.0.0 → 1.0.1`);
  //   expect(logger.info).toHaveBeenNthCalledWith(3, `barda is outdated: 1.0.0 → 1.0.1`);
  //   expect(logger.info).toHaveBeenNthCalledWith(4, 'UPGRADING…');
  //   expect(logger.info).toHaveBeenNthCalledWith(5, `npm i oli@1.0.1 \nnpm i -D barda@1.0.1 `);
  //   expect(logger.info).toHaveBeenNthCalledWith(6, `Upgraded dependencies:\noli@1.0.1`);
  //   expect(logger.info).toHaveBeenNthCalledWith(
  //     7,
  //     `Upgraded development dependencies:\nbarda@1.0.1`
  //   );
  // });

  // test('throw error when npm module name is invalid', async () => {
  //   const dir = 'dir24';
  //   jest.mock(
  //     `dir24/package.json`,
  //     () => ({ dependencies: { 'bad name Dependency': '^1.2.3' }, devDependencies: {} }),
  //     { virtual: true }
  //   );
  //   jest.mock('dir24/node_modules/bad name Dependency/package.json', () => ({ version: '1.2.3' }), {
  //     virtual: true
  //   });
  //   await expect(verifyDeps({ autoUpgrade: true, dir, logger })).rejects.toThrow(
  //     'NPM package name: "bad name Dependency" is invalid. name can only contain URL-friendly characters'
  //   );
  // });

  // test('should verify dependencies when npm module has one version available, npm view returns string instead of array', async () => {
  //   const dir = 'dir25';
  //   jest.mock(
  //     `dir25/package.json`,
  //     () => ({ dependencies: { foo1: '^1.1.1' }, devDependencies: {} }),
  //     { virtual: true }
  //   );
  //   jest.mock('dir25/node_modules/foo1/package.json', () => ({ version: '1.1.1' }), {
  //     virtual: true
  //   });
  //   mockExecAsync
  //     .mockImplementationOnce(() => Promise.resolve({ stdout: '"1.1.1"' }))
  //     .mockImplementationOnce(() =>
  //       Promise.resolve({ stdout: JSON.stringify({ latest: '1.1.1' }) })
  //     );
  //   await verifyDeps({ dir, logger });
  //   expect(logger.info).toHaveBeenCalledTimes(2);
  //   expect(logger.info).toHaveBeenNthCalledWith(1, 'Verifying dependencies…\n');
  //   expect(logger.info).toHaveBeenNthCalledWith(2, `All NPM modules are up to date.`);
  // });
});
