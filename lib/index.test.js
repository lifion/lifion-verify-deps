'use strict';

const chalk = require('chalk');
const Chance = require('chance');
const { promisify: getMockExecAsync } = require('util');
const { join: mockJoin } = require('path');
const verifyDeps = require('.');

jest.mock('path', () => ({ join: jest.fn() }));
jest.mock('child_process', () => ({}));
jest.mock('util', () => {
  const mockExecAsync = jest.fn();
  return { promisify: () => mockExecAsync };
});

const chance = new Chance();
const moduleNameRegex = new RegExp('npm view (.*) versions --json');
const pathString = './index.test.js';
const mockExecAsync = getMockExecAsync();
const mockExports = {};

describe('lib/index', () => {
  const dir = chance.word();
  const outdatedDep = chance.word();
  const updatedDep = chance.word();
  const outdatedDevDep = chance.word();
  const updatedDevDep = chance.word();
  const logger = { info: jest.fn() };
  let olderVersion;
  let newerVersion;

  beforeEach(() => {
    olderVersion = '1.0.0';
    newerVersion = '1.0.1';
    mockExports.version = olderVersion;
    mockExports.dependencies = {
      [outdatedDep]: `^${olderVersion}`,
      [updatedDep]: `^${olderVersion}`
    };
    mockExports.devDependencies = {
      [outdatedDevDep]: `^${olderVersion}`,
      [updatedDevDep]: `^${olderVersion}`
    };
    mockExecAsync.mockImplementation(command => {
      const moduleName = command.match(moduleNameRegex)[1];
      const versions = [olderVersion];
      if (moduleName === outdatedDep || moduleName === outdatedDevDep) versions.push(newerVersion);
      return Promise.resolve({ stdout: JSON.stringify(versions) });
    });
    mockJoin.mockImplementation(() => pathString);
  });

  afterEach(() => {
    logger.info.mockClear();
    mockExecAsync.mockClear();
    mockJoin.mockClear();
  });

  it('should compare installed dependencies to latest NPM versions', async () => {
    delete mockExports.devDependencies;
    try {
      await verifyDeps({ dir, logger });
      throw new Error('Failed to throw error.');
    } catch (err) {
      expect(err.message).toEqual(chalk.red('Please update your installed modules.'));
      expect(mockExecAsync).toHaveBeenCalledWith(`npm view ${outdatedDep} versions --json`);
      expect(mockExecAsync).toHaveBeenCalledWith(`npm view ${updatedDep} versions --json`);
      expect(mockJoin).toHaveBeenCalledWith(dir, 'package.json');
      expect(mockJoin).toHaveBeenCalledWith(dir, 'node_modules', outdatedDep, 'package.json');
      expect(mockJoin).toHaveBeenCalledWith(dir, 'node_modules', updatedDep, 'package.json');
    }
  });

  it('should compare installed devDpendencies to latest NPM versions', async () => {
    delete mockExports.dependencies;
    try {
      await verifyDeps({ dir, logger });
      throw new Error('Failed to throw error.');
    } catch (err) {
      expect(err.message).toEqual(chalk.red('Please update your installed modules.'));
      expect(mockExecAsync).toHaveBeenCalledWith(`npm view ${outdatedDevDep} versions --json`);
      expect(mockExecAsync).toHaveBeenCalledWith(`npm view ${updatedDevDep} versions --json`);
      expect(mockJoin).toHaveBeenCalledWith(dir, 'package.json');
      expect(mockJoin).toHaveBeenCalledWith(dir, 'node_modules', outdatedDevDep, 'package.json');
      expect(mockJoin).toHaveBeenCalledWith(dir, 'node_modules', updatedDevDep, 'package.json');
    }
  });

  it('should show dependency update required when using semver and later version in range is available', async () => {
    try {
      await verifyDeps({ dir, logger });
      throw new Error('Failed to throw error.');
    } catch (err) {
      expect(err.message).toEqual(chalk.red('Please update your installed modules.'));
      expect(logger.info).toHaveBeenCalledWith(
        `${chalk.red(outdatedDep)} is outdated: ${chalk.red(olderVersion)} → ${chalk.green(
          newerVersion
        )}`
      );
      expect(logger.info).toHaveBeenCalledWith(
        `${chalk.red(outdatedDevDep)} is outdated: ${chalk.red(olderVersion)} → ${chalk.green(
          newerVersion
        )}`
      );
      expect(logger.info).toHaveBeenCalledWith(`npm i ${outdatedDep}@${newerVersion}`);
      expect(logger.info).toHaveBeenCalledWith(`npm i -D ${outdatedDevDep}@${newerVersion}`);
      expect(logger.info).toHaveBeenCalledTimes(7);
      expect(err.message).toEqual(chalk.red('Please update your installed modules.'));
    }
  });

  it('should not show dependency update required when using semver and later version is out of range', async () => {
    newerVersion = '2.0.0';
    await verifyDeps({ dir, logger });
    expect(logger.info).toHaveBeenCalledWith(chalk.green('All NPM modules are up to date.'));
    expect(logger.info).toHaveBeenCalledTimes(2);
  });

  it('should show dependency update required when version is locked if non-major-version update available', async () => {
    newerVersion = '1.1.0';
    mockExports.dependencies[outdatedDep] = olderVersion;
    mockExports.devDependencies[outdatedDevDep] = olderVersion;
    try {
      await verifyDeps({ dir, logger });
      throw new Error('Failed to throw error.');
    } catch (err) {
      expect(err.message).toEqual(chalk.red('Please update your installed modules.'));
      expect(logger.info).toHaveBeenCalledWith(
        `${chalk.red(outdatedDep)} is outdated: ${chalk.red(olderVersion)} → ${chalk.green(
          newerVersion
        )}`
      );
      expect(logger.info).toHaveBeenCalledWith(
        `${chalk.red(outdatedDevDep)} is outdated: ${chalk.red(olderVersion)} → ${chalk.green(
          newerVersion
        )}`
      );
      expect(logger.info).toHaveBeenCalledWith(`npm i ${outdatedDep}@${newerVersion}`);
      expect(logger.info).toHaveBeenCalledWith(`npm i -D ${outdatedDevDep}@${newerVersion}`);
      expect(logger.info).toHaveBeenCalledTimes(7);
    }
  });

  it('should not show dependency update required when version is locked if only major-version update available', async () => {
    mockExports.dependencies[outdatedDep] = olderVersion;
    mockExports.devDependencies[outdatedDevDep] = olderVersion;
    newerVersion = '2.0.0';
    await verifyDeps({ dir, logger });
    expect(logger.info).toHaveBeenCalledWith(chalk.green('All NPM modules are up to date.'));
    expect(logger.info).toHaveBeenCalledTimes(2);
  });

  it('should show dependency install required if module cannot be found', async () => {
    mockJoin.mockImplementation((...args) => {
      if (args[2] === outdatedDep) throw new Error('module not found');
      return pathString;
    });
    try {
      await verifyDeps({ dir, logger });
      throw new Error('Failed to throw error.');
    } catch (err) {
      expect(err.message).toEqual(chalk.red('Please update your installed modules.'));
      expect(logger.info).toHaveBeenCalledWith(
        `${chalk.red(outdatedDep)} is ${chalk.red('not installed')}`
      );
      expect(logger.info).toHaveBeenCalledWith(`npm i ${outdatedDep}@${newerVersion}`);
      expect(logger.info).toHaveBeenCalledWith(`npm i -D ${outdatedDevDep}@${newerVersion}`);
      expect(logger.info).toHaveBeenCalledTimes(7);
    }
  });

  it('should show dependency install required if fetching versions does not return valid JSON output', async () => {
    const invalidOutput = chance.word();
    mockExecAsync.mockImplementation(() => ({ stdout: invalidOutput }));
    let syntaxError;
    try {
      JSON.parse(invalidOutput);
    } catch (err) {
      syntaxError = err;
    }
    try {
      await verifyDeps({ dir, logger });
      throw new Error('Failed to throw error.');
    } catch (err) {
      expect(err.message).toBe(`Failed to parse output from NPM view - ${syntaxError.toString()}`);
    }
  });

  it('should show dependency install required if latest module is installed but not reflected in package.json', async () => {
    mockExports.dependencies[outdatedDep] = `^${newerVersion}`;
    mockExports.devDependencies[outdatedDevDep] = `^${newerVersion}`;
    try {
      await verifyDeps({ dir, logger });
      throw new Error('Failed to throw error.');
    } catch (err) {
      expect(err.message).toEqual(chalk.red('Please update your installed modules.'));
      expect(logger.info).toHaveBeenCalledWith(
        `${chalk.red(outdatedDep)} is outdated: ${chalk.red(newerVersion)} → ${chalk.green(
          newerVersion
        )}`
      );
      expect(logger.info).toHaveBeenCalledWith(
        `${chalk.red(outdatedDevDep)} is outdated: ${chalk.red(newerVersion)} → ${chalk.green(
          newerVersion
        )}`
      );
      expect(logger.info).toHaveBeenCalledWith(`npm i ${outdatedDep}@${newerVersion}`);
      expect(logger.info).toHaveBeenCalledWith(`npm i -D ${outdatedDevDep}@${newerVersion}`);
      expect(logger.info).toHaveBeenCalledTimes(7);
    }
  });

  it('should not throw an error if no dependencies are in package.json', async () => {
    delete mockExports.dependencies;
    delete mockExports.devDependencies;
    await verifyDeps({ dir, logger });
    expect(logger.info).toHaveBeenCalledWith(chalk.green('All NPM modules are up to date.'));
    expect(logger.info).toHaveBeenCalledTimes(2);
  });

  it('should not throw an error if dependencies are empty in package.json', async () => {
    mockExports.dependencies = {};
    mockExports.devDependencies = {};
    await verifyDeps({ dir, logger });
    expect(logger.info).toHaveBeenCalledWith(chalk.green('All NPM modules are up to date.'));
    expect(logger.info).toHaveBeenCalledTimes(2);
  });

  it('should default to native console when no logger is passed', async () => {
    const consoleInfo = console.info;
    console.info = jest.fn();
    try {
      await verifyDeps({ dir });
      throw new Error('Failed to throw error.');
    } catch (err) {
      expect(err.message).toEqual(chalk.red('Please update your installed modules.'));
      expect(console.info).toHaveBeenCalledTimes(7);
    }
    console.info = consoleInfo;
  });

  it('should not throw type error if options are not passed', async () => {
    const consoleInfo = console.info;
    console.info = jest.fn();
    try {
      await verifyDeps();
      throw new Error('Failed to throw error.');
    } catch (err) {
      expect(err.message).toEqual(chalk.red('Please update your installed modules.'));
    }
    console.info = consoleInfo;
  });
});

module.exports = mockExports;
