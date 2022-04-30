# gorb [![Node.js CI](https://github.com/gorbjs/gorb/actions/workflows/node.js.yml/badge.svg)](https://github.com/gorbjs/gorb/actions/workflows/node.js.yml)

A drop-in (almost) replacement for Gulp. Minimum dependencies, for Nodejs v18+.

* Minimum dependencies. But only supports Nodejs v18+.
  - micromatch
  - @parcel/watcher
  - @parcel/source-map
* Kept as much as possible the original Gulp features. Dropped few deprecated (or nobody used) features.
  - removed support of streaming contents. Only use buffer for Vinyl file. That means it cannot support file with huge content size.
  - removed APIs `task()` and `registry()` which is designed for older task system before Gulp v4.
  - (TBD) changed API `watch()`.

