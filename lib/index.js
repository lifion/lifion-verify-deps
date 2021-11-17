/**
 * @module lifion-verify-deps
 */

'use strict';

const chalk = require('chalk');
const path = require('path');
const semver = require('semver');
const semverPrerelease = require('semver/functions/prerelease');
const { exec } = require('child_process');
const { promisify } = require('util');
const validatePackageName = require('validate-npm-package-name');

const { blue, bold, green, red } = chalk;
const execAsync = promisify(exec);

/**
 * Validates package name.
 *
 * @param {string} name - Package name.
 * @throws {Error} - Package name is invalid.
 */
function isValidNpmPackageName(name) {
  const { errors } = validatePackageName(name);
  if (errors) {
    throw new Error(`NPM package name: "${name}" is invalid. ${errors}`);
  }
}

/**
 * Gets available versions for provided package name.
 *
 * @param {string} name - Package name.
 * @returns {Promise<string[]>} - List of available versions.
 * @throws {Error} - Output failed JSON parse.
 */
async function getLatestVersions(name) {
  isValidNpmPackageName(name);
  try {
    const { stdout } = await execAsync(`npm view ${name} versions --json`);
    const versions = JSON.parse(stdout);
    return Array.isArray(versions) ? versions : [versions];
  } catch (err) {
    const message =
      err instanceof SyntaxError
        ? `Failed to parse output from NPM view when getting versions - ${err.toString()}`
        : `Error getting latest versions - ${err}`;
    throw new Error(message);
  }
}

/**
 * Gets latest tag from provided package name.
 *
 * @param {string} name - Package name.
 * @returns {Promise<string>} - Return latest version, if latest tag exists.
 * @throws {Error} - Output failed JSON parse.
 */
async function getLatestTag(name) {
  isValidNpmPackageName(name);
  try {
    const { stdout } = await execAsync(`npm view ${name} dist-tags --json`);
    const { latest } = JSON.parse(stdout);
    return latest;
  } catch (err) {
    const message =
      err instanceof SyntaxError
        ? `Failed to parse output from NPM view when getting tags - ${err.toString()}`
        : `Error getting latest tag - ${err}`;
    throw new Error(message);
  }
}

/**
 * Finds valid upgrade version of the provided package name.
 *
 * @param {string} name - Package name.
 * @param {string} wanted - Package version.
 * @returns {Promise<string>} - Valid upgrade version.
 * @throws {Error} - Outdated version in package.json, version was likely unpublished.
 */
async function getLatestVersion(name, wanted) {
  const versions = await getLatestVersions(name);
  const latest = await getLatestTag(name);
  let applicableVersions = versions.filter((i) => semver.satisfies(i, wanted));
  const prereleases = [];
  if (semverPrerelease(wanted.slice(1))) {
    for (const version of versions) {
      if (semverPrerelease(version)) {
        prereleases.push(version);
      }
    }
    applicableVersions = prereleases.filter((i) => semver.satisfies(i, wanted));
  }

  applicableVersions.sort((a, b) => semver.rcompare(a, b));

  if (applicableVersions.length === 0) {
    throw new Error(
      `${red(
        `Current version of ${name}:${wanted} seems to be invalid. The version was likely unpublished. Please manually upgrade to a valid version and re-run this application.`
      )}`
    );
  }

  if (!semverPrerelease(wanted.slice(1)) && latest && semver.lt(latest, applicableVersions[0])) {
    return latest;
  }
  return applicableVersions[0];
}

/**
 * Gets currently installed version for provided package name.
 *
 * @param {string} currentDir - Path to package.json directory.
 * @param {string} name - Package name.
 * @param {Logger} logger - Logger flag.
 * @returns {string | null} - Installed version or null if not installed.
 * @throws {Error} - Unable to find installed versions, try installing node modules by running `npm i`.
 */
function getInstalledVersion(currentDir, name, logger) {
  try {
    return require(path.join(currentDir, 'node_modules', name, 'package.json')).version;
  } catch (err) {
    logger.info(`Error getting a list of installed modules from package.json - ${err}`);
    return null;
  }
}

/**
 * Builds list of packages to update.
 *
 * @param {Object} params - Object with parameters.
 * @param {Object.<string, any>} params.deps - List of dependencies.
 * @param {string} params.dir - Directory location.
 * @param {Logger} params.logger - Logging tool.
 * @param {string} params.type - Type of dependency.
 * @returns {Array<Promise<PackageStatus>>} - NPM package state.
 */
function pushPkgs({ deps, dir, logger, type }) {
  return Object.keys(deps).map(async (name) => {
    const wanted = deps[name];
    const installed = getInstalledVersion(dir, name, logger);
    const latest = await getLatestVersion(name, wanted);
    const wantedFixed = wanted.slice(1);
    const shouldBeInstalled =
      installed === null || wantedFixed !== installed || installed !== latest;
    if (shouldBeInstalled) {
      const warning =
        installed !== null
          ? `outdated: ${red(wantedFixed !== installed ? wantedFixed : installed)} → ${green(
              latest
            )}`
          : red('not installed');
      logger.info(`${red(name)} is ${warning}`);
    }
    return { installed, latest, name, shouldBeInstalled, type, wanted };
  });
}

/**
 * Formats package name for installation.
 *
 * @param {Array<PackageStatus>} filteredPkgs - Package properties.
 * @returns {string} - Concatenated 'name@latest' for provided package.
 */
function getPkgIds(filteredPkgs) {
  return filteredPkgs.map(({ latest, name }) => `${name}@${latest}`).join(' ');
}

/**
 * Filters out dependencies with locked versions.
 *
 * @param {Object.<string, string>} deps - List of dependencies.
 * @returns {Object} List of dependencies excluding locked semver versions.
 */
function removeLockedDependencies(deps) {
  let depsToUpgrade = {};

  for (const name of Object.keys(deps)) {
    const version = deps[name];
    const firstChar = version.charAt(0);
    if (firstChar === '^' || firstChar === '~') {
      depsToUpgrade = { ...depsToUpgrade, [name]: version };
    }
  }
  return depsToUpgrade;
}

/**
 * Verifies the dependencies listed in the package.json of the given directory.
 *
 * @alias module:lifion-verify-deps
 * @param {Object} [options] - Optional parameters.
 * @param {boolean} [options.autoUpgrade=false] - Automatically upgrade all suggested dependencies.
 * @param {string} [options.dir] - The path where to look for the package.json file.
 * @param {Logger} [options.logger] - A logger instance, with a similar API as the console object.
 */
async function verifyDeps({ autoUpgrade = false, dir = '', logger = console } = {}) {
  const { dependencies = {}, devDependencies = {} } = require(path.join(dir, 'package.json'));
  // console.warn('-->', dependencies, devDependencies);
  logger.info(blue('Verifying dependencies…\n'));

  const pkgs = await Promise.all([
    ...pushPkgs({ deps: removeLockedDependencies(dependencies), dir, logger, type: 'prod' }),
    ...pushPkgs({ deps: removeLockedDependencies(devDependencies), dir, logger, type: 'dev' })
  ]);
  const toInstall = pkgs.filter(({ shouldBeInstalled }) => shouldBeInstalled);
  if (toInstall.length > 0) {
    const prodPkgs = toInstall.filter(({ type }) => type === 'prod');
    let upgradePackages = '';
    if (prodPkgs.length > 0) {
      upgradePackages += `npm i ${getPkgIds(prodPkgs)} `;
    }
    const devPkgs = toInstall.filter(({ type }) => type === 'dev');
    if (devPkgs.length > 0) {
      upgradePackages += `\nnpm i -D ${getPkgIds(devPkgs)} `;
    }

    if (autoUpgrade) {
      logger.info('UPGRADING…');
      logger.info(upgradePackages);
      const prodResult = await execAsync(`npm i ${getPkgIds(prodPkgs)}`);
      const devResult = await execAsync(`npm i -D ${getPkgIds(devPkgs)}`);
      logger.info(`${green(`${bold('Upgraded dependencies:\n')}${prodResult.stdout}`)}`);
      logger.info(`${green(`${bold('Upgraded development dependencies:\n')}${devResult.stdout}`)}`);
    } else {
      logger.info(`\n${bold('To resolve this, run:')}`);
      logger.info(upgradePackages);
      throw new Error(red('Please update your installed modules.'));
    }
  } else {
    logger.info(green('All NPM modules are up to date.'));
  }
}

module.exports = verifyDeps;

/**
 * @typedef Logger
 * @property {Function} debug - Prints standard output with newline.
 * @property {Function} error - Prints standard error with newline.
 * @property {Function} info - Prints standard output with newline.
 * @property {Function} warn - Prints standard error with newline.
 */

/**
 * @typedef PackageStatus
 * @property {string | null} installed - Currently installed version.
 * @property {string} latest - Latest version available.
 * @property {string} name - Module name.
 * @property {boolean} shouldBeInstalled - If module should be installed.
 * @property {string} type - Module type.
 * @property {string} wanted - Version from package.json.
 */
