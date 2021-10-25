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
 * @param {string} name - package name.
 * @throws {Error} - package name is invalid.
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
 * @param {string} name - package name.
 * @returns {Promise<string[]>}
 * @throws {Error} - output failed JSON parse.
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
        ? `Failed to parse output from NPM view - ${err.toString()}`
        : `Error getting latest versions - ${err}`;
    throw new Error(message);
  }
}

/**
 * Gets latest tag from provided package name.
 *
 * @param {string} name - package name.
 * @returns {Promise<string>} - return latest version, if latest tag exists.
 * @throws {Error} - output failed JSON parse.
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
        ? `Failed to parse output from NPM view - ${err.toString()}`
        : `Error getting latest tag - ${err}`;
    throw new Error(message);
  }
}

/**
 * Finds valid upgrade version of the provided package name.
 *
 * @param {string} name - package name.
 * @param {string} wanted - package version.
 * @returns {Promise<string>} - valid upgrade version.
 * @throws {Error} - package.json has outdated version, likely unpublished.
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
 * @param {string} currentDir - path to package.json directory.
 * @param {string} name - package name.
 * @param {Logger} logger - logger flag.
 * @returns {string | null}
 * @throws {Error} - unable to find installed versions, try installing node modules by running `npm i`.
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
 * @param {Object} params -
 * @param {string} params.dir - directory location.
 * @param {Logger} params.logger - logging tool.
 * @param {*} params.deps - list of dependencies.
 * @param {string} params.type - type of dependency.
 * @returns {Array<Promise<PackageStatus>>}
 */
function pushPkgs({ dir, logger, deps = {}, type }) {
  return Object.keys(deps).map(async (name) => {
    let wanted = deps[name];
    if (!wanted.startsWith('^')) wanted = `^${wanted}`;
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
 * @param {Array<PackageStatus>} filteredPkgs - package properties.
 * @returns {string} - concatenated 'name@latest' for provided package.
 */
function getPkgIds(filteredPkgs) {
  return filteredPkgs.map(({ latest, name }) => `${name}@${latest}`).join(' ');
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
  const { dependencies, devDependencies } = require(path.join(dir, 'package.json'));
  logger.info(blue('Verifying dependencies…\n'));

  const pkgs = await Promise.all([
    ...pushPkgs({ deps: dependencies, dir, logger, type: 'prod' }),
    ...pushPkgs({ deps: devDependencies, dir, logger, type: 'dev' })
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
 * @property {Function} info - Prints standard output with newline.
 * @property {Function} warn - Prints standard error with newline.
 * @property {Function} error - Prints standard error with newline.
 * @property {Function} debug - Prints standard output with newline.
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
