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
  const logger = { info: jest.fn(), error: jest.fn() };
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
    logger.error.mockClear();
    mockExecAsync.mockClear();
    mockJoin.mockClear();
  });

  it('should show dependency update required when using semver and later patch version available', async () => {
    try {
      await verifyDeps({ dir, logger });
    } catch (err) {
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

  it('should show dependency update required when using semver and later minor version available', async () => {
    newerVersion = '1.1.0';
    try {
      await verifyDeps({ dir, logger });
    } catch (err) {
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

  it('should not show dependency update required when using semver and later major version available', async () => {
    newerVersion = '2.0.0';
    await verifyDeps({ dir, logger });
    expect(logger.info).toHaveBeenCalledWith(chalk.green('All NPM modules are up to date.'));
    expect(logger.info).toHaveBeenCalledTimes(2);
  });

  it('should not show dependency update required installed version matches locked version', async () => {
    mockExports.dependencies[outdatedDep] = olderVersion;
    mockExports.devDependencies[outdatedDevDep] = olderVersion;
    newerVersion = '2.0.0';
    await verifyDeps({ dir, logger });
    expect(logger.info).toHaveBeenCalledWith(chalk.green('All NPM modules are up to date.'));
    expect(logger.info).toHaveBeenCalledTimes(2);
  });

  it('should show dependency update required when version is locked if non-major-version update available', async () => {
    mockExports.dependencies[outdatedDep] = olderVersion;
    mockExports.devDependencies[outdatedDevDep] = olderVersion;
    try {
      await verifyDeps({ dir, logger });
    } catch (err) {
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
    } catch (err) {
      expect(logger.info).toHaveBeenCalledWith(
        `${chalk.red(outdatedDep)} is ${chalk.red('not installed')}`
      );
      expect(logger.info).toHaveBeenCalledWith(`npm i ${outdatedDep}@${newerVersion}`);
      expect(logger.info).toHaveBeenCalledWith(`npm i -D ${outdatedDevDep}@${newerVersion}`);
      expect(logger.info).toHaveBeenCalledTimes(7);
      expect(err.message).toEqual(chalk.red('Please update your installed modules.'));
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
    } catch (err) {
      expect(err.message).toBe(`Failed to parse output from NPM view - ${syntaxError.toString()}`);
    }
  });
});

module.exports = mockExports;
