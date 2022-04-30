# @gorb/shared [![Node.js CI](https://github.com/gorbjs/shared/actions/workflows/node.js.yml/badge.svg)](https://github.com/gorbjs/shared/actions/workflows/node.js.yml)

Vinyl and other building blocks for Gorb and Gulp plugins.
* Zero dependency. But only supports Nodejs v18+.
* Kept as much as possible the original code from following projects.

## Vinyl
https://github.com/gulpjs/vinyl

Removed stream support from original.

```js
  import { Vinyl } from '@gorb/shared';
  new Vinyl({
    cwd: '/',
    base: '/src/',
    path: '/src/test.txt',
    contents: Buffer.from('test')
  });
```

## PluginError

https://github.com/gulpjs/plugin-error

In TypeScript project, the return type of `new PluginError(...)` is not as flexible as the original. This is due to we didn't use TypeScript namespace.

The type definitions for the options is not `PluginError.Options` anymore. Use `PluginErrorOptions`.

```js
  import { PluginError, PluginErrorOptions } from '@gorb/shared';
  new PluginError("plugin-name", "something broke");
  new PluginError("plugin-name", { message: "something broke" });
  new PluginError({ plugin: "test", message: "something broke" });
  new PluginError("plugin-name", new Error("something broke"), {showStack: true});
```

## log

https://github.com/gulpjs/fancy-log

Removed checking colour support. Assumes user terminal supports ansi colour.

```js
  import { log } from '@gorb/shared';
  log("message");
  log.info("message");
  log.warn("message");
  log.error("message");
  log.dir(obj);
```
