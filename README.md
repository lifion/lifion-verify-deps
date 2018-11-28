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

<a name="exp_module_lifion-verify-deps--verifyDeps"></a>

### verifyDeps([options]) ⏏

Verifies the dependencies listed in the package.json of the given directory.

**Kind**: Exported function

| Param            | Type                | Description                                                  |
| ---------------- | ------------------- | ------------------------------------------------------------ |
| [options]        | <code>Object</code> | Optional parameters.                                         |
| [options.dir]    | <code>string</code> | The path where to look for the package.json file.            |
| [options.logger] | <code>Object</code> | A logger instance, with a similar API as the console object. |

## License

[MIT](./LICENSE)
