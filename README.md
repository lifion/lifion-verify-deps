# lifion-verify-deps

Verifies that installed NPM modules are the latest currently available version.

## Getting Started

To install the module:

```sh
npm install lifion-verify-deps --global
```

To run command:

```sh
lifion-verify-deps
```

To use as module:

```sh
const verifyDeps = require('lifion-verify-deps');

verifyDeps({ dir: './path-to/project-directory' })
  .then(() => /* all installed packages up to date */)
  .catch((err) => /* there are packages to be updated */)
```

## API Reference


* [lifion-verify-deps](#module_lifion-verify-deps)
    * [verifyDeps([options])](#exp_module_lifion-verify-deps--verifyDeps) ⏏
        * [~isValidNpmPackageName(name)](#module_lifion-verify-deps--verifyDeps..isValidNpmPackageName)
        * [~getLatestVersions(name)](#module_lifion-verify-deps--verifyDeps..getLatestVersions) ⇒ <code>Promise.&lt;Array.&lt;string&gt;&gt;</code>
        * [~getLatestTag(name)](#module_lifion-verify-deps--verifyDeps..getLatestTag) ⇒ <code>Promise.&lt;string&gt;</code>
        * [~getLatestVersion(name, wanted)](#module_lifion-verify-deps--verifyDeps..getLatestVersion) ⇒ <code>Promise.&lt;string&gt;</code>
        * [~getInstalledVersion(currentDir, name, logger)](#module_lifion-verify-deps--verifyDeps..getInstalledVersion) ⇒ <code>string</code> \| <code>null</code>
        * [~pushPkgs(params)](#module_lifion-verify-deps--verifyDeps..pushPkgs) ⇒ <code>Array.&lt;Promise.&lt;PackageStatus&gt;&gt;</code>
        * [~getPkgIds(filteredPkgs)](#module_lifion-verify-deps--verifyDeps..getPkgIds) ⇒ <code>string</code>

<a name="exp_module_lifion-verify-deps--verifyDeps"></a>

### verifyDeps([options]) ⏏
Verifies the dependencies listed in the package.json of the given directory.

**Kind**: Exported function  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| [options] | <code>Object</code> |  | Optional parameters. |
| [options.autoUpgrade] | <code>boolean</code> | <code>false</code> | Automatically upgrade all suggested dependencies. |
| [options.dir] | <code>string</code> |  | The path where to look for the package.json file. |
| [options.logger] | [<code>Logger</code>](#Logger) |  | A logger instance, with a similar API as the console object. |

<a name="module_lifion-verify-deps--verifyDeps..isValidNpmPackageName"></a>

#### verifyDeps~isValidNpmPackageName(name)
Validates package name.

**Kind**: inner method of [<code>verifyDeps</code>](#exp_module_lifion-verify-deps--verifyDeps)  
**Throws**:

- <code>Error</code> - package name is invalid.


| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | package name. |

<a name="module_lifion-verify-deps--verifyDeps..getLatestVersions"></a>

#### verifyDeps~getLatestVersions(name) ⇒ <code>Promise.&lt;Array.&lt;string&gt;&gt;</code>
Gets available versions for provided package name.

**Kind**: inner method of [<code>verifyDeps</code>](#exp_module_lifion-verify-deps--verifyDeps)  
**Throws**:

- <code>Error</code> - output failed JSON parse.


| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | package name. |

<a name="module_lifion-verify-deps--verifyDeps..getLatestTag"></a>

#### verifyDeps~getLatestTag(name) ⇒ <code>Promise.&lt;string&gt;</code>
Gets latest tag from provided package name.

**Kind**: inner method of [<code>verifyDeps</code>](#exp_module_lifion-verify-deps--verifyDeps)  
**Returns**: <code>Promise.&lt;string&gt;</code> - - return latest version, if latest tag exists.  
**Throws**:

- <code>Error</code> - output failed JSON parse.


| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | package name. |

<a name="module_lifion-verify-deps--verifyDeps..getLatestVersion"></a>

#### verifyDeps~getLatestVersion(name, wanted) ⇒ <code>Promise.&lt;string&gt;</code>
Finds valid upgrade version of the provided package name.

**Kind**: inner method of [<code>verifyDeps</code>](#exp_module_lifion-verify-deps--verifyDeps)  
**Returns**: <code>Promise.&lt;string&gt;</code> - - valid upgrade version.  
**Throws**:

- <code>Error</code> - package.json has outdated version, likely unpublished.


| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | package name. |
| wanted | <code>string</code> | package version. |

<a name="module_lifion-verify-deps--verifyDeps..getInstalledVersion"></a>

#### verifyDeps~getInstalledVersion(currentDir, name, logger) ⇒ <code>string</code> \| <code>null</code>
Gets currently installed version for provided package name.

**Kind**: inner method of [<code>verifyDeps</code>](#exp_module_lifion-verify-deps--verifyDeps)  
**Throws**:

- <code>Error</code> - unable to find installed versions, try installing node modules by running `npm i`.


| Param | Type | Description |
| --- | --- | --- |
| currentDir | <code>string</code> | path to package.json directory. |
| name | <code>string</code> | package name. |
| logger | [<code>Logger</code>](#Logger) | logger flag. |

<a name="module_lifion-verify-deps--verifyDeps..pushPkgs"></a>

#### verifyDeps~pushPkgs(params) ⇒ <code>Array.&lt;Promise.&lt;PackageStatus&gt;&gt;</code>
**Kind**: inner method of [<code>verifyDeps</code>](#exp_module_lifion-verify-deps--verifyDeps)  

| Param | Type | Description |
| --- | --- | --- |
| params | <code>Object</code> | - |
| params.dir | <code>string</code> | - |
| params.logger | [<code>Logger</code>](#Logger) | - |
| params.deps | <code>\*</code> | - |
| params.type | <code>string</code> | - |

<a name="module_lifion-verify-deps--verifyDeps..getPkgIds"></a>

#### verifyDeps~getPkgIds(filteredPkgs) ⇒ <code>string</code>
**Kind**: inner method of [<code>verifyDeps</code>](#exp_module_lifion-verify-deps--verifyDeps)  
**Returns**: <code>string</code> - - concatenated 'name@latest' for provided package.  

| Param | Type | Description |
| --- | --- | --- |
| filteredPkgs | [<code>Array.&lt;PackageStatus&gt;</code>](#PackageStatus) | package properties. |


## License

[MIT](./LICENSE)
