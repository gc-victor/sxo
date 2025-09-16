## [0.6.0] - 2025-09-16

### 🚀 Features

- *(config)* Make per-route client entry subdirectory configurable via clientDir
- *(cli)* Add --client-dir option and include in explicit flag set
- *(jsx)* Introduce __jsxList helper for array rendering
- *(jsx)* [**breaking**] Migrate to Rust/WASM JSX transformer

### 🚜 Refactor

- *(hot-reload)* Replace NodeList.forEach with for...of during state restoration
- *(jsx)* Remove jsx_extractor module
- *(jsx)* Implement streaming jsx parser
- *(jsx)* Overhaul precompiler to use streaming parser
- *(build)* Adopt transformer in esbuild plugin and dev server
- *(jsx)* Modularize jsx_parser into separate modules
- *(jsx)* Modularize jsx_transformer into separate modules
- *(jsx)* Update mod.rs to include test modules

### 📚 Documentation

- Document configurable clientDir and update examples/CLI/env tables
- Add prompt.txt assistant persona and SXO framework context
- *(transformer)* Update docs and prompts for transformer + artifact path

### 🧪 Testing

- *(config,cli)* Cover clientDir defaults, env/file/flag precedence, and explicitness
- *(jsx)* Add comprehensive test suites for modular JSX components

### ⚙️ Miscellaneous Tasks

- *(make)* Remove stray blank lines
- *(repo)* Update ignore and npm packaging for transformer artifacts
- *(pkg)* Update package description for transformer
- *(dev)* Add Cargo dependency updater script

## [0.5.0] - 2025-09-03

### 🚀 Features

- *(build)* Configurable publicPath for assets

### 📚 Documentation

- Document publicPath and update AGENTS guard-rails

### 🧪 Testing

- *(config)* Cover publicPath precedence and empty value handling

### ⚙️ Miscellaneous Tasks

- *(examples)* Use local CLI entry, refresh lockfile

## [0.4.0] - 2025-09-02

### 🚀 Features

- *(build)* Route-driven client entries; configurable loaders

### 📚 Documentation

- Update global.css optionality and loaders configuration

### 🧪 Testing

- *(config)* Add tests for loaders normalization and env propagation

## [0.3.1] - 2025-09-01

### 📚 Documentation

- *(readme)* Document static generation; add server timeout env vars
- *(agents)* Update guard-rails for static generation

## [0.3.0] - 2025-09-01

### 🚀 Features

- *(cli)* Add generate command
- *(generate)* Implement static generator for static routes
- *(server)* Serve generated pages and improve prod robustness

### 💼 Other

- Ensure sequential execution in release target
- Refactor release workflow to branch-first bump-inside and cleanup

### 📚 Documentation

- Dark-light mode logo

## [0.2.0]

### 🚀 Features

- Create sxo
- *(examples)* Add Cloudflare Workers example
- *(examples)* Add basic example manifest
- *(examples)* Add posts example pages

### 🐛 Bug Fixes

- *(dev)* Close EventSource on beforeunload in hot-reload client

### 📚 Documentation

- *(examples)* Document Cloudflare Workers example in README
- *(examples)* Document Basic Example
- *(readme)* Add posts example docs and update example tree
