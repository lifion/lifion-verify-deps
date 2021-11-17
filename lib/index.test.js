'use strict';

const { promisify: getMockExecAsync } = require('util');
const path = require('path');

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

const { join: mockJoin } = path;
jest.mock('path', () => ({ join: jest.fn() }));

const dir = 'foo';

const mockExecAsync = getMockExecAsync();

describe('lib/index', () => {
  const logger = { info: jest.fn() };

  afterEach(() => {
    logger.info.mockClear();
    mockExecAsync.mockClear();
  });

  test('should upgrade upto patch versions when versions prefixed with ~', async () => {
    mockJoin.mockImplementation(() => '../test-helpers/test1.js');
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
    expect(logger.info).toHaveBeenCalledTimes(4);
    expect(logger.info).toHaveBeenNthCalledWith(1, 'Verifying dependencies…\n');
    expect(logger.info).toHaveBeenNthCalledWith(2, 'foo1 is outdated: 46.45.44 → 46.45.45');
    expect(logger.info).toHaveBeenNthCalledWith(3, '\nTo resolve this, run:');
    expect(logger.info).toHaveBeenNthCalledWith(4, 'npm i foo1@46.45.45 ');
  });

  test('should upgrade upto minor versions when versions prefixed with ^', async () => {
    mockJoin.mockImplementation(() => '../test-helpers/test2.js');

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
    expect(logger.info).toHaveBeenCalledTimes(4);
    expect(logger.info).toHaveBeenNthCalledWith(1, 'Verifying dependencies…\n');
    expect(logger.info).toHaveBeenNthCalledWith(2, 'foo1 is outdated: 46.45.44 → 46.46.0');
    expect(logger.info).toHaveBeenNthCalledWith(3, '\nTo resolve this, run:');
    expect(logger.info).toHaveBeenNthCalledWith(4, 'npm i foo1@46.46.0 ');
  });

  test('should not upgrade locked versions', async () => {
    mockJoin.mockImplementation(() => '../test-helpers/test3.js');

    await expect(verifyDeps({ dir, logger })).resolves.toBeUndefined();
    expect(logger.info).toHaveBeenCalledTimes(2);
    expect(logger.info).toHaveBeenNthCalledWith(1, 'Verifying dependencies…\n');
    expect(logger.info).toHaveBeenNthCalledWith(2, 'All NPM modules are up to date.');
  });

  test('should compare installed dependencies to latest NPM versions', async () => {
    mockJoin.mockImplementation(() => '../test-helpers/test4.js');

    mockExecAsync
      .mockImplementationOnce(() => Promise.resolve({ stdout: JSON.stringify(['1.0.0', '1.0.1']) }))
      .mockImplementationOnce(() =>
        Promise.resolve({ stdout: JSON.stringify({ latest: '1.0.1' }) })
      );
    await expect(verifyDeps({ dir, logger })).rejects.toThrow(
      'Please update your installed modules.'
    );
    expect(mockExecAsync).toHaveBeenCalledWith(`npm view jugageni versions --json`);
    expect(mockExecAsync).toHaveBeenCalledWith(`npm view jugageni dist-tags --json`);
  });

  test('should compare installed devDpendencies to latest NPM versions', async () => {
    mockJoin.mockImplementation(() => '../test-helpers/test5.js');

    mockExecAsync
      .mockImplementationOnce(() => Promise.resolve({ stdout: JSON.stringify(['1.0.0', '1.0.1']) }))
      .mockImplementationOnce(() =>
        Promise.resolve({ stdout: JSON.stringify({ latest: '1.0.1' }) })
      );
    await expect(verifyDeps({ dir, logger })).rejects.toThrow(
      'Please update your installed modules.'
    );
    expect(mockExecAsync).toHaveBeenCalledWith(`npm view jugageni versions --json`);
    expect(mockExecAsync).toHaveBeenCalledWith(`npm view jugageni dist-tags --json`);
  });

  test('should show dependency update required when using semver and later version in range is available', async () => {
    mockJoin
      .mockImplementationOnce(() => '../test-helpers/test6.js')
      .mockImplementationOnce(() => '../test-helpers/test6.js')
      .mockImplementationOnce(() => {
        throw new Error('foo');
      });
    mockExecAsync
      .mockImplementationOnce(() => Promise.resolve({ stdout: JSON.stringify(['1.0.0', '1.0.1']) }))
      .mockImplementationOnce(() => Promise.resolve({ stdout: JSON.stringify(['1.0.0', '1.0.1']) }))
      .mockImplementationOnce(() =>
        Promise.resolve({ stdout: JSON.stringify({ latest: '1.0.1' }) })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({ stdout: JSON.stringify({ latest: '1.0.1' }) })
      );
    await expect(verifyDeps({ dir, logger })).rejects.toThrow(
      'Please update your installed modules.'
    );

    expect(logger.info).toHaveBeenCalledTimes(6);
    expect(logger.info).toHaveBeenNthCalledWith(1, 'Verifying dependencies…\n');
    expect(logger.info).toHaveBeenNthCalledWith(
      2,
      `Error getting a list of installed modules from package.json - Error: foo`
    );
    expect(logger.info).toHaveBeenNthCalledWith(3, `suji is outdated: 1.0.0 → 1.0.1`);
    expect(logger.info).toHaveBeenNthCalledWith(4, `ju is not installed`);
    expect(logger.info).toHaveBeenNthCalledWith(5, `\n${'To resolve this, run:'}`);
    expect(logger.info).toHaveBeenNthCalledWith(6, `npm i suji@1.0.1 \nnpm i -D ju@1.0.1 `);
  });

  test('should not show dependency update required when using semver and later version is out of range', async () => {
    mockJoin.mockImplementation(() => '../test-helpers/test7.js');
    mockExecAsync
      .mockImplementationOnce(() => Promise.resolve({ stdout: JSON.stringify(['1.0.0', '2.0.0']) }))
      .mockImplementationOnce(() =>
        Promise.resolve({ stdout: JSON.stringify({ latest: '1.0.0' }) })
      );
    await verifyDeps({ dir, logger });
    expect(logger.info).toHaveBeenCalledTimes(2);
    expect(logger.info).toHaveBeenNthCalledWith(1, 'Verifying dependencies…\n');
    expect(logger.info).toHaveBeenNthCalledWith(2, 'All NPM modules are up to date.');
  });

  test('should show dependency update required when version is locked if non-major-version update available', async () => {
    mockJoin.mockImplementation(() => '../test-helpers/test8.js');
    mockExecAsync
      .mockImplementationOnce(() => Promise.resolve({ stdout: JSON.stringify(['1.0.0']) }))
      .mockImplementationOnce(() => Promise.resolve({ stdout: JSON.stringify(['1.0.0', '1.1.0']) }))
      .mockImplementationOnce(() => Promise.resolve({ stdout: JSON.stringify(['1.0.0']) }))
      .mockImplementationOnce(() => Promise.resolve({ stdout: JSON.stringify(['1.0.0', '1.1.0']) }))
      .mockImplementationOnce(() =>
        Promise.resolve({ stdout: JSON.stringify({ latest: '1.0.0' }) })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({ stdout: JSON.stringify({ latest: '1.1.0' }) })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({ stdout: JSON.stringify({ latest: '1.0.0' }) })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({ stdout: JSON.stringify({ latest: '1.1.0' }) })
      );
    await expect(verifyDeps({ dir, logger })).rejects.toThrow(
      'Please update your installed modules.'
    );
    expect(logger.info).toHaveBeenCalledTimes(5);
    expect(logger.info).toHaveBeenNthCalledWith(1, 'Verifying dependencies…\n');
    expect(logger.info).toHaveBeenNthCalledWith(2, `lezejujuk is outdated: 1.0.0 → 1.1.0`);
    expect(logger.info).toHaveBeenNthCalledWith(3, `voliki is outdated: 1.0.0 → 1.1.0`);
    expect(logger.info).toHaveBeenNthCalledWith(4, `\n${'To resolve this, run:'}`);
    expect(logger.info).toHaveBeenNthCalledWith(
      5,
      `npm i lezejujuk@1.1.0 \nnpm i -D voliki@1.1.0 `
    );
  });

  test('should not show dependency update required when version is locked if major-version update available', async () => {
    mockJoin.mockImplementation(() => '../test-helpers/test9.js');

    mockExecAsync
      .mockImplementationOnce(() => Promise.resolve({ stdout: JSON.stringify(['1.0.0', '2.0.0']) }))
      .mockImplementationOnce(() => Promise.resolve({ stdout: JSON.stringify(['1.0.0', '2.0.0']) }))
      .mockImplementationOnce(() =>
        Promise.resolve({ stdout: JSON.stringify({ latest: '2.0.0' }) })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({ stdout: JSON.stringify({ latest: '2.0.0' }) })
      );
    await verifyDeps({ dir, logger });
    expect(logger.info).toHaveBeenCalledTimes(2);
    expect(logger.info).toHaveBeenNthCalledWith(1, 'Verifying dependencies…\n');
    expect(logger.info).toHaveBeenCalledWith('All NPM modules are up to date.');
  });

  test('should show dependency install required if module cannot be found', async () => {
    mockJoin.mockImplementation(() => '../test-helpers/test10.js');
    mockExecAsync
      .mockImplementationOnce(() => Promise.resolve({ stdout: JSON.stringify(['1.0.0', '1.0.1']) }))
      .mockImplementationOnce(() => Promise.resolve({ stdout: JSON.stringify(['1.0.0', '1.0.1']) }))
      .mockImplementationOnce(() =>
        Promise.resolve({ stdout: JSON.stringify({ latest: '1.0.1' }) })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({ stdout: JSON.stringify({ latest: '1.0.1' }) })
      );
    await expect(verifyDeps({ dir, logger })).rejects.toThrow(
      'Please update your installed modules.'
    );
    expect(logger.info).toHaveBeenCalledTimes(5);
    expect(logger.info).toHaveBeenNthCalledWith(1, 'Verifying dependencies…\n');
    expect(logger.info).toHaveBeenNthCalledWith(2, `eri is not installed`);
    expect(logger.info).toHaveBeenNthCalledWith(3, `ok is not installed`);
    expect(logger.info).toHaveBeenNthCalledWith(4, `\nTo resolve this, run:`);
    expect(logger.info).toHaveBeenNthCalledWith(5, `npm i eri@1.0.1 \nnpm i -D ok@1.0.1 `);
  });

  test('should show dependency install required if fetching versions does not return valid JSON output', async () => {
    mockJoin.mockImplementation(() => '../test-helpers/test11.js');
    const invalidOutput = 'boo';
    mockExecAsync.mockImplementationOnce(() => ({ stdout: invalidOutput }));
    let syntaxError;
    try {
      JSON.parse(invalidOutput);
    } catch (err) {
      syntaxError = err;
    }
    await expect(verifyDeps({ dir, logger })).rejects.toThrow(
      `Failed to parse output from NPM view when getting versions - ${syntaxError.toString()}`
    );
  });

  test('should show dependency install required if fetching tags does not return valid JSON output', async () => {
    mockJoin.mockImplementation(() => '../test-helpers/test12.js');
    const invalidOutput = 'boo';
    mockExecAsync
      .mockImplementationOnce(() =>
        Promise.resolve({ stdout: JSON.stringify({ stdout: JSON.stringify(['1.0.0', '1.0.1']) }) })
      )
      .mockImplementationOnce(() => ({ stdout: invalidOutput }));
    let syntaxError;
    try {
      JSON.parse(invalidOutput);
    } catch (err) {
      syntaxError = err;
    }
    await expect(verifyDeps({ dir, logger })).rejects.toThrow(
      `Failed to parse output from NPM view when getting tags - ${syntaxError.toString()}`
    );
  });

  test('throw error when getting latest versions fails', async () => {
    mockJoin.mockImplementation(() => '../test-helpers/test13.js');
    mockExecAsync.mockImplementation(() => {
      throw new Error('foo');
    });
    await expect(verifyDeps({ dir, logger })).rejects.toThrow(
      `Error getting latest versions - Error: foo`
    );
  });

  test('throw error when getting latest tag fails', async () => {
    mockJoin.mockImplementation(() => '../test-helpers/test14.js');
    mockExecAsync
      .mockImplementationOnce(() =>
        Promise.resolve({ stdout: JSON.stringify({ stdout: JSON.stringify(['1.0.0', '1.0.1']) }) })
      )
      .mockImplementationOnce(() => {
        throw new Error('boo');
      });
    await expect(verifyDeps({ dir, logger })).rejects.toThrow(
      `Error getting latest tag - Error: boo`
    );
  });

  test('should show dependency install required if latest module is installed but not reflected in package.json', async () => {
    mockJoin.mockImplementation(() => '../test-helpers/test15.js');
    mockExecAsync
      .mockImplementationOnce(() => Promise.resolve({ stdout: JSON.stringify(['1.0.0', '1.0.1']) }))
      .mockImplementationOnce(() => Promise.resolve({ stdout: JSON.stringify(['1.0.0', '1.0.1']) }))
      .mockImplementationOnce(() =>
        Promise.resolve({ stdout: JSON.stringify({ latest: '1.0.1' }) })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({ stdout: JSON.stringify({ latest: '1.0.1' }) })
      );
    await expect(verifyDeps({ dir, logger })).rejects.toThrow(
      'Please update your installed modules.'
    );
    expect(logger.info).toHaveBeenCalledTimes(5);
    expect(logger.info).toHaveBeenNthCalledWith(1, 'Verifying dependencies…\n');
    expect(logger.info).toHaveBeenNthCalledWith(2, `lule is outdated: 1.0.0 → 1.0.1`);
    expect(logger.info).toHaveBeenNthCalledWith(3, `neh is outdated: 1.0.0 → 1.0.1`);
    expect(logger.info).toHaveBeenNthCalledWith(4, `\n${'To resolve this, run:'}`);
    expect(logger.info).toHaveBeenNthCalledWith(5, `npm i lule@1.0.1 \nnpm i -D neh@1.0.1 `);
  });

  test('should not throw an error if no dependencies are in package.json', async () => {
    mockJoin.mockImplementation(() => '../test-helpers/test16.js');
    await verifyDeps({ dir, logger });
    expect(logger.info).toHaveBeenCalledTimes(2);
    expect(logger.info).toHaveBeenNthCalledWith(1, 'Verifying dependencies…\n');
    expect(logger.info).toHaveBeenNthCalledWith(2, 'All NPM modules are up to date.');
  });

  test('should default to native console when no logger is passed', async () => {
    const consoleInfo = console.info;
    console.info = jest.fn();

    mockJoin.mockImplementation(() => '../test-helpers/test17.js');
    mockExecAsync
      .mockImplementationOnce(() => Promise.resolve({ stdout: JSON.stringify(['1.0.0', '1.0.1']) }))
      .mockImplementationOnce(() => Promise.resolve({ stdout: JSON.stringify(['1.0.0', '1.0.1']) }))
      .mockImplementationOnce(() =>
        Promise.resolve({ stdout: JSON.stringify({ latest: '1.0.1' }) })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({ stdout: JSON.stringify({ latest: '1.0.1' }) })
      );
    await expect(verifyDeps({ dir })).rejects.toThrow('Please update your installed modules.');
    expect(console.info).toHaveBeenCalledTimes(5);
    expect(console.info).toHaveBeenNthCalledWith(1, 'Verifying dependencies…\n');
    expect(console.info).toHaveBeenNthCalledWith(2, `eri is outdated: 1.0.0 → 1.0.1`);
    expect(console.info).toHaveBeenNthCalledWith(3, `ok is outdated: 1.0.0 → 1.0.1`);
    expect(console.info).toHaveBeenNthCalledWith(4, `\n${'To resolve this, run:'}`);
    expect(console.info).toHaveBeenNthCalledWith(5, `npm i eri@1.0.1 \nnpm i -D ok@1.0.1 `);
    console.info = consoleInfo;
  });

  test('should not throw type error if options are not passed', async () => {
    mockJoin.mockImplementation(() => '../test-helpers/test18.js');
    mockExecAsync
      .mockImplementationOnce(() => Promise.resolve({ stdout: JSON.stringify(['1.0.0', '1.0.1']) }))
      .mockImplementationOnce(() =>
        Promise.resolve({ stdout: JSON.stringify({ latest: '1.0.1' }) })
      );
    const consoleInfo = console.info;
    console.info = jest.fn();
    await expect(verifyDeps()).rejects.toThrow('Please update your installed modules.');
    console.info = consoleInfo;
  });

  test('should update to version aliased as latest when aliased latest is less that most recent published version', async () => {
    mockJoin.mockImplementation(() => '../test-helpers/test19.js');
    mockExecAsync
      .mockImplementationOnce(() => Promise.resolve({ stdout: JSON.stringify(['1.2.4', '1.2.5']) }))
      .mockImplementationOnce(() => Promise.resolve({ stdout: JSON.stringify(['1.2.4', '1.2.5']) }))
      .mockImplementationOnce(() =>
        Promise.resolve({ stdout: JSON.stringify({ latest: '1.2.4' }) })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({ stdout: JSON.stringify({ latest: '1.2.4' }) })
      )
      .mockImplementationOnce(() => Promise.resolve({ stdout: 'foo1@1.2.4' }))
      .mockImplementationOnce(() => Promise.resolve({ stdout: 'fooDev1@1.2.4' }));
    await verifyDeps({ autoUpgrade: true, dir, logger });
    expect(logger.info).toHaveBeenCalledTimes(7);
    expect(logger.info).toHaveBeenNthCalledWith(1, 'Verifying dependencies…\n');
    expect(logger.info).toHaveBeenNthCalledWith(2, `foo1 is outdated: 1.2.3 → 1.2.4`);
    expect(logger.info).toHaveBeenNthCalledWith(3, `fooDev1 is outdated: 1.2.3 → 1.2.4`);
    expect(logger.info).toHaveBeenNthCalledWith(4, 'UPGRADING…');
    expect(logger.info).toHaveBeenNthCalledWith(5, `npm i foo1@1.2.4 \nnpm i -D fooDev1@1.2.4 `);
    expect(logger.info).toHaveBeenNthCalledWith(6, `Upgraded dependencies:\nfoo1@1.2.4`);
    expect(logger.info).toHaveBeenNthCalledWith(
      7,
      `Upgraded development dependencies:\nfooDev1@1.2.4`
    );
  });

  test('should upgrade pre-release versions to latest pre-release version available', async () => {
    mockJoin.mockImplementation(() => '../test-helpers/test20.js');
    mockExecAsync
      .mockImplementationOnce(() =>
        Promise.resolve({ stdout: JSON.stringify(['1.0.0-alpha.1', '1.0.0-alpha.2', '1.2.4']) })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({ stdout: JSON.stringify({ latest: '1.2.4' }) })
      );
    await expect(verifyDeps({ dir, logger })).rejects.toThrow(
      'Please update your installed modules.'
    );
    expect(logger.info).toHaveBeenCalledTimes(4);
    expect(logger.info).toHaveBeenNthCalledWith(1, 'Verifying dependencies…\n');
    expect(logger.info).toHaveBeenNthCalledWith(
      2,
      `foo1 is outdated: 1.0.0-alpha.0 → 1.0.0-alpha.2`
    );
    expect(logger.info).toHaveBeenNthCalledWith(3, '\nTo resolve this, run:');
    expect(logger.info).toHaveBeenNthCalledWith(4, `npm i foo1@1.0.0-alpha.2 `);
  });

  test('should not upgrade when no version available for major version of pre-release', async () => {
    mockJoin.mockImplementation(() => '../test-helpers/test21.js');
    mockExecAsync
      .mockImplementationOnce(() => {
        return Promise.resolve({
          stdout: JSON.stringify([
            '0.0.0-alpha.0',
            '1.0.0-alpha.0',
            '1.2.4',
            '1.2.5',
            '2.0.0-alpha.0'
          ])
        });
      })
      .mockImplementationOnce(() => {
        return Promise.resolve({ stdout: JSON.stringify({ latest: '1.2.5' }) });
      });
    await verifyDeps({ dir, logger });
    expect(logger.info).toHaveBeenCalledTimes(2);
    expect(logger.info).toHaveBeenNthCalledWith(1, 'Verifying dependencies…\n');
    expect(logger.info).toHaveBeenNthCalledWith(2, `All NPM modules are up to date.`);
  });

  test('should throw an error when version in package.json is invalid (likely unpublished)', async () => {
    mockJoin.mockImplementation(() => '../test-helpers/test22.js');
    mockExecAsync
      .mockImplementationOnce(() => Promise.resolve({ stdout: JSON.stringify(['1.0.0', '1.2.1']) }))
      .mockImplementationOnce(() =>
        Promise.resolve({ stdout: JSON.stringify({ latest: '1.2.1' }) })
      );
    const error = new Error(
      `Current version of foo1:^1.2.4 seems to be invalid. The version was likely unpublished. Please manually upgrade to a valid version and re-run this application.`
    );
    await expect(verifyDeps({ autoUpgrade: true, dir, logger })).rejects.toEqual(error);
  });

  test('autoUpgrade modules', async () => {
    mockJoin.mockImplementation(() => '../test-helpers/test23.js');
    mockExecAsync
      .mockImplementationOnce(() => Promise.resolve({ stdout: JSON.stringify(['1.0.0', '1.0.1']) }))
      .mockImplementationOnce(() => Promise.resolve({ stdout: JSON.stringify(['1.0.0', '1.0.1']) }))
      .mockImplementationOnce(() =>
        Promise.resolve({ stdout: JSON.stringify({ latest: '1.0.1' }) })
      )
      .mockImplementationOnce(() =>
        Promise.resolve({ stdout: JSON.stringify({ latest: '1.0.1' }) })
      )
      .mockImplementationOnce(() => Promise.resolve({ stdout: 'oli@1.0.1' }))
      .mockImplementationOnce(() => Promise.resolve({ stdout: 'barda@1.0.1' }));
    await verifyDeps({ autoUpgrade: true, dir, logger });
    expect(logger.info).toHaveBeenCalledTimes(7);
    expect(logger.info).toHaveBeenNthCalledWith(1, 'Verifying dependencies…\n');
    expect(logger.info).toHaveBeenNthCalledWith(2, `oli is outdated: 1.0.0 → 1.0.1`);
    expect(logger.info).toHaveBeenNthCalledWith(3, `barda is outdated: 1.0.0 → 1.0.1`);
    expect(logger.info).toHaveBeenNthCalledWith(4, 'UPGRADING…');
    expect(logger.info).toHaveBeenNthCalledWith(5, `npm i oli@1.0.1 \nnpm i -D barda@1.0.1 `);
    expect(logger.info).toHaveBeenNthCalledWith(6, `Upgraded dependencies:\noli@1.0.1`);
    expect(logger.info).toHaveBeenNthCalledWith(
      7,
      `Upgraded development dependencies:\nbarda@1.0.1`
    );
  });

  test('throw error when npm module name is invalid', async () => {
    mockJoin.mockImplementation(() => '../test-helpers/test24.js');
    await expect(verifyDeps({ autoUpgrade: true, dir, logger })).rejects.toThrow(
      'NPM package name: "bad name Dependency" is invalid. name can only contain URL-friendly characters'
    );
  });

  test('should verify dependencies when npm module has one version available, npm view returns string instead of array', async () => {
    mockJoin.mockImplementation(() => '../test-helpers/test25.js');
    mockExecAsync
      .mockImplementationOnce(() => Promise.resolve({ stdout: '"1.1.1"' }))
      .mockImplementationOnce(() =>
        Promise.resolve({ stdout: JSON.stringify({ latest: '1.1.1' }) })
      );
    await verifyDeps({ dir, logger });
    expect(logger.info).toHaveBeenCalledTimes(2);
    expect(logger.info).toHaveBeenNthCalledWith(1, 'Verifying dependencies…\n');
    expect(logger.info).toHaveBeenNthCalledWith(2, `All NPM modules are up to date.`);
  });
});
