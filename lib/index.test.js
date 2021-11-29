'use strict';

jest.mock('./utils/get-installed-versions.js');
jest.mock('./utils/get-dependencies.js');
jest.mock('./utils/get-latest-versions.js');
jest.mock('./utils/get-latest-tag.js');
jest.mock('./utils/install-packages.js');
jest.mock('./utils/install-dev-packages.js');

const getInstalledVersion = require('./utils/get-installed-versions');
const getDependencies = require('./utils/get-dependencies');
const getLatestVersions = require('./utils/get-latest-versions');
const getLatestTag = require('./utils/get-latest-tag');
const installPackages = require('./utils/install-packages');
const installDevPackages = require('./utils/install-dev-packages');
const verifyDeps = require('.');

jest.mock('chalk', () => ({
  blue: (str) => str,
  bold: (str) => str,
  green: (str) => str,
  red: (str) => str
}));

const dir = 'foo';

describe('lib/index', () => {
  const logger = { info: jest.fn() };

  afterEach(() => {
    jest.resetModules();
    logger.info.mockClear();
  });

  function mockDependencies(obj) {
    getDependencies.mockImplementationOnce(() => obj);
  }
  function mockInstalledVersion(version) {
    getInstalledVersion.mockImplementationOnce(() => ({ version }));
  }
  function mockLatestVersions(arr) {
    getLatestVersions.mockImplementationOnce(() =>
      Promise.resolve({ stdout: JSON.stringify(arr) })
    );
  }
  function mockLatestTag(latest) {
    getLatestTag.mockImplementationOnce(() =>
      Promise.resolve({ stdout: JSON.stringify({ latest }) })
    );
  }

  function mockInstallPackages(stdout) {
    installPackages.mockImplementationOnce(() => Promise.resolve({ stdout }));
  }
  function mockInstallDevPackages(stdout) {
    installDevPackages.mockImplementationOnce(() => Promise.resolve({ stdout }));
  }

  test('should upgrade upto patch versions when versions prefixed with ~', async () => {
    mockDependencies({ dependencies: { foo1: '~46.45.44' }, devDependencies: {} });
    mockInstalledVersion('46.45.44');
    mockLatestVersions(['46.45.45', '46.46.0']);
    mockLatestTag('46.46.0');
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
    mockDependencies({ dependencies: { foo1: '^46.45.44' }, devDependencies: {} });
    mockInstalledVersion('46.45.44');
    mockLatestVersions(['46.45.45', '46.46.0']);
    mockLatestTag('46.46.0');
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
    mockDependencies({ dependencies: { foo1: '46.45.44' }, devDependencies: {} });
    await expect(verifyDeps({ dir, logger })).resolves.toBeUndefined();
    expect(logger.info).toHaveBeenCalledTimes(2);
    expect(logger.info).toHaveBeenNthCalledWith(1, 'Verifying dependencies…\n');
    expect(logger.info).toHaveBeenNthCalledWith(2, 'All NPM modules are up to date.');
  });

  test('should not show dependency update required when using semver and later version is out of range', async () => {
    mockDependencies({ dependencies: {}, devDependencies: { mi: '^1.0.0' } });
    mockInstalledVersion('1.0.0');
    mockLatestVersions(['1.0.0', '2.0.0']);
    mockLatestTag('2.0.0');
    await verifyDeps({ dir, logger });
    expect(logger.info).toHaveBeenCalledTimes(2);
    expect(logger.info).toHaveBeenNthCalledWith(1, 'Verifying dependencies…\n');
    expect(logger.info).toHaveBeenNthCalledWith(2, 'All NPM modules are up to date.');
  });

  test('when node module is not installed', async () => {
    mockDependencies({ dependencies: {}, devDependencies: { mi: '^1.0.0' } });
    getInstalledVersion.mockImplementationOnce(() => {
      throw new Error('foobar');
    });
    mockLatestVersions(['1.0.0', '1.0.1', '2.0.0']);
    mockLatestTag('2.0.0');
    try {
      await verifyDeps({ dir, logger });
    } catch (err) {
      console.warn('final err', err);
    }
    console.warn(logger.info.mock.calls);
    expect(logger.info).toHaveBeenCalledTimes(5);
    expect(logger.info).toHaveBeenNthCalledWith(1, 'Verifying dependencies…\n');
    expect(logger.info).toHaveBeenNthCalledWith(
      2,
      'Error getting a list of installed modules from package.json - Error: foobar'
    );
    expect(logger.info).toHaveBeenNthCalledWith(3, 'mi is not installed');
    expect(logger.info).toHaveBeenNthCalledWith(4, '\nTo resolve this, run:');
    expect(logger.info).toHaveBeenNthCalledWith(5, '\nnpm i -D mi@1.0.1 ');
  });

  test('should show dependency update required when version is locked if non-major-version update available', async () => {
    mockDependencies({
      dependencies: { fu: '^1.0.0', lezejujuk: '^1.0.0' },
      devDependencies: { kuvrib: '^1.0.0', voliki: '^1.0.0' }
    });
    mockInstalledVersion('1.0.0');
    mockInstalledVersion('1.0.0');
    mockInstalledVersion('1.0.0');
    mockInstalledVersion('1.0.0');
    mockLatestVersions(['1.0.0']);
    mockLatestVersions(['1.0.0', '1.1.0']);
    mockLatestVersions(['1.0.0']);
    mockLatestVersions(['1.0.0', '1.1.0']);
    mockLatestTag('1.0.0');
    mockLatestTag('1.1.0');
    mockLatestTag('1.0.0');
    mockLatestTag('1.1.0');
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
    mockDependencies({ dependencies: { an: '^1.0.0' }, devDependencies: { pu: '^1.0.0' } });
    mockInstalledVersion('1.0.0');
    mockInstalledVersion('1.0.0');
    mockLatestVersions(['1.0.0', '2.0.0']);
    mockLatestVersions(['1.0.0', '2.0.0']);
    mockLatestTag('2.0.0');
    mockLatestTag('2.0.0');
    await verifyDeps({ dir, logger });
    expect(logger.info).toHaveBeenCalledTimes(2);
    expect(logger.info).toHaveBeenNthCalledWith(1, 'Verifying dependencies…\n');
    expect(logger.info).toHaveBeenCalledWith('All NPM modules are up to date.');
  });

  test('should show dependency install required if module cannot be found', async () => {
    mockDependencies({ dependencies: { eri: '^1.0.0' }, devDependencies: { ok: '^1.0.0' } });
    mockInstalledVersion(null);
    mockInstalledVersion(null);
    mockLatestVersions(['1.0.0', '1.0.1']);
    mockLatestVersions(['1.0.0', '1.0.1']);
    mockLatestTag('1.0.1');
    mockLatestTag('1.0.1');
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
    mockDependencies({ dependencies: { kita: '^1.0.0' } });
    mockInstalledVersion('1.0.0');
    const invalidOutput = 'boo';
    let syntaxError;
    try {
      JSON.parse(invalidOutput);
    } catch (err) {
      syntaxError = err;
    }
    getLatestVersions.mockImplementationOnce(() => {
      throw syntaxError;
    });
    await expect(verifyDeps({ dir, logger })).rejects.toThrow(
      `Failed to parse output from NPM view when getting versions - ${syntaxError.toString()}`
    );
  });

  test('should show dependency install required if fetching tags does not return valid JSON output', async () => {
    mockDependencies({ dependencies: { mks: '^1.0.0' } });
    mockInstalledVersion('1.0.0');
    mockLatestVersions(['1.0.0', '1.0.1']);
    const invalidOutput = 'boo';
    let syntaxError;
    try {
      JSON.parse(invalidOutput);
    } catch (err) {
      syntaxError = err;
    }
    getLatestTag.mockImplementationOnce(() => {
      throw syntaxError;
    });
    await expect(verifyDeps({ dir, logger })).rejects.toThrow(
      `Failed to parse output from NPM view when getting tags - ${syntaxError.toString()}`
    );
  });

  test('throw error when getting latest versions fails', async () => {
    mockDependencies({ dependencies: { tans: '^1.0.0' } });
    mockInstalledVersion('1.0.0');
    getLatestVersions.mockImplementation(() => {
      throw new Error('foo');
    });
    await expect(verifyDeps({ dir, logger })).rejects.toThrow(
      `Error getting latest versions - Error: foo`
    );
  });

  test('throw error when getting latest tag fails', async () => {
    mockDependencies({ dependencies: { utex: '^1.0.0' } });
    mockInstalledVersion('1.0.0');
    mockLatestVersions(['1.0.0', '1.0.1']);
    getLatestTag.mockImplementationOnce(() => {
      throw new Error('boo');
    });
    await expect(verifyDeps({ dir, logger })).rejects.toThrow(
      `Error getting latest tag - Error: boo`
    );
  });

  test('should show dependency install required if latest module is installed but not reflected in package.json', async () => {
    mockDependencies({
      dependencies: { lule: '^1.0.0' },
      devDependencies: { neh: '^1.0.0' }
    });
    mockInstalledVersion('1.0.1');
    mockInstalledVersion('1.0.1');
    mockLatestVersions(['1.0.0', '1.0.1']);
    mockLatestVersions(['1.0.0', '1.0.1']);
    mockLatestTag('1.0.1');
    mockLatestTag('1.0.1');
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
    mockDependencies({});
    await verifyDeps({ dir, logger });
    expect(logger.info).toHaveBeenCalledTimes(2);
    expect(logger.info).toHaveBeenNthCalledWith(1, 'Verifying dependencies…\n');
    expect(logger.info).toHaveBeenNthCalledWith(2, 'All NPM modules are up to date.');
  });

  test('should default to native console when no logger is passed', async () => {
    const consoleInfo = console.info;
    console.info = jest.fn();
    mockDependencies({
      dependencies: { eri: '^1.0.0' },
      devDependencies: { ok: '^1.0.0' }
    });
    mockInstalledVersion('1.0.0');
    mockInstalledVersion('1.0.0');
    mockLatestVersions(['1.0.0', '1.0.1']);
    mockLatestVersions(['1.0.0', '1.0.1']);
    mockLatestTag('1.0.1');
    mockLatestTag('1.0.1');
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
    mockDependencies({ dependencies: { eri: '^1.0.0' } });
    mockInstalledVersion('1.0.0');
    mockLatestVersions(['1.0.0', '1.0.1']);
    mockLatestTag('1.0.1');
    const consoleInfo = console.info;
    console.info = jest.fn();
    await expect(verifyDeps()).rejects.toThrow('Please update your installed modules.');
    console.info = consoleInfo;
  });

  test('should update to version aliased as latest when aliased latest is less that most recent published version', async () => {
    mockDependencies({ dependencies: { foo1: '^1.2.3' }, devDependencies: { fooDev1: '^1.2.3' } });
    mockInstalledVersion('1.2.3');
    mockInstalledVersion('1.2.3');
    mockLatestVersions(['1.2.4', '1.2.5']);
    mockLatestVersions(['1.2.4', '1.2.5']);
    mockLatestTag('1.2.4');
    mockLatestTag('1.2.4');
    mockInstallPackages('foo1@1.2.4');
    mockInstallDevPackages('fooDev1@1.2.4');
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
    mockDependencies({ dependencies: { foo1: '^1.0.0-alpha.0' }, devDependencies: {} });
    mockInstalledVersion('1.0.0-alpha.0');
    mockLatestVersions(['1.0.0-alpha.1', '1.0.0-alpha.2', '1.2.4']);
    mockLatestTag('1.2.4');
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
    mockDependencies({ dependencies: { foo1: '^1.0.0-alpha.0' }, devDependencies: {} });
    mockInstalledVersion('1.0.0-alpha.0');
    mockLatestVersions(['0.0.0-alpha.0', '1.0.0-alpha.0', '1.2.4', '1.2.5', '2.0.0-alpha.0']);
    mockLatestTag('1.2.5');
    await verifyDeps({ dir, logger });
    expect(logger.info).toHaveBeenCalledTimes(2);
    expect(logger.info).toHaveBeenNthCalledWith(1, 'Verifying dependencies…\n');
    expect(logger.info).toHaveBeenNthCalledWith(2, `All NPM modules are up to date.`);
  });

  test('should throw an error when version in package.json is invalid (likely unpublished)', async () => {
    mockDependencies({ dependencies: { foo1: '^1.2.4' }, devDependencies: {} });
    mockInstalledVersion('1.2.4');
    mockLatestVersions(['1.0.0', '1.2.1']);
    mockLatestTag('1.2.1');
    const error = new Error(
      `Current version of foo1:^1.2.4 seems to be invalid. The version was likely unpublished. Please manually upgrade to a valid version and re-run this application.`
    );
    await expect(verifyDeps({ autoUpgrade: true, dir, logger })).rejects.toEqual(error);
  });

  test('autoUpgrade modules', async () => {
    mockDependencies({ dependencies: { oli: '^1.0.0' }, devDependencies: { barda: '^1.0.0' } });
    mockInstalledVersion('1.0.0');
    mockInstalledVersion('1.0.0');
    mockLatestVersions(['1.0.0', '1.0.1']);
    mockLatestVersions(['1.0.0', '1.0.1']);
    mockLatestTag('1.0.1');
    mockLatestTag('1.0.1');
    mockInstallPackages('oli@1.0.1');
    mockInstallDevPackages('barda@1.0.1');
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

  test('autoUpgrade modules when no prod dependencies', async () => {
    mockDependencies({ dependencies: {}, devDependencies: { barda: '^1.0.0' } });
    mockInstalledVersion('1.0.0');
    mockLatestVersions(['1.0.0', '1.0.1']);
    mockLatestTag('1.0.1');
    mockInstallPackages('');
    mockInstallDevPackages('barda@1.0.1');
    await verifyDeps({ autoUpgrade: true, dir, logger });
    expect(logger.info).toHaveBeenCalledTimes(6);
    expect(logger.info).toHaveBeenNthCalledWith(1, 'Verifying dependencies…\n');
    expect(logger.info).toHaveBeenNthCalledWith(2, `barda is outdated: 1.0.0 → 1.0.1`);
    expect(logger.info).toHaveBeenNthCalledWith(3, 'UPGRADING…');
    expect(logger.info).toHaveBeenNthCalledWith(4, `\nnpm i -D barda@1.0.1 `);
    expect(logger.info).toHaveBeenNthCalledWith(5, `Upgraded dependencies:\n`);
    expect(logger.info).toHaveBeenNthCalledWith(
      6,
      `Upgraded development dependencies:\nbarda@1.0.1`
    );
  });
  test('should verify dependencies when npm module has one version available, npm view returns string instead of array', async () => {
    mockDependencies({ dependencies: { foo1: '^1.1.1' }, devDependencies: {} });
    mockInstalledVersion('1.1.1');
    mockLatestVersions('1.1.1');
    mockLatestTag('1.1.1');
    await verifyDeps({ dir, logger });
    expect(logger.info).toHaveBeenCalledTimes(2);
    expect(logger.info).toHaveBeenNthCalledWith(1, 'Verifying dependencies…\n');
    expect(logger.info).toHaveBeenNthCalledWith(2, `All NPM modules are up to date.`);
  });

  test('throw error when npm module name is invalid', async () => {
    mockDependencies({ dependencies: { 'bad name Dependency': '^1.2.3' }, devDependencies: {} });
    mockInstalledVersion('1.2.3');
    getLatestVersions.mockImplementationOnce(() => {
      throw new Error('name can only contain URL-friendly characters');
    });
    await expect(verifyDeps({ autoUpgrade: true, dir, logger })).rejects.toThrow(
      'NPM package name: "bad name Dependency" is invalid. name can only contain URL-friendly characters'
    );
  });
});
