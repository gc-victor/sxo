## [0.9.1] - 2025-12-11

### 🐛 Bug Fixes

- *(middleware)* Gate cache-busting to dev mode only

### 🚜 Refactor

- Remove deprecated @since tags from codebase

### 📚 Documentation

- Deprecate @since JSDoc tag in favor of git history

## [0.9.0] - 2025-12-11

### 🚀 Features

- *(examples/workers)* Add asset injection and pre-rendered page support
- *(runtime)* [**breaking**] Add Web Standard runtime handlers
- *(server)* Add shared server utilities for multi-runtime support
- *(cli)* Improve create command with runtime-specific templates
- *(build)* Enhance esbuild config and hot-reload
- *(server)* Add structured logging utility
- *(templates)* Add runtime-specific project templates
- *(examples)* Add runtime-specific examples
- *(examples)* Update workers example with new architecture
- *(server)* Add new shared loader utilities

### 💼 Other

- *(examples/basic)* Upgrade @qery/reactive-component to v0.8.0
- *(examples/workers)* Update dependencies and add reactive-component
- Update package configuration for new exports

### 🚜 Refactor

- *(examples/basic)* Migrate counter to reactive-component v0.8.0 API
- *(examples/workers)* Migrate counter to reactive-component v0.8.0 API
- *(server)* Remove deprecated apply-head utility
- *(dev)* [**breaking**] Refactor dev server with multi-runtime support
- *(prod)* [**breaking**] Refactor prod server with multi-runtime support
- Update older server utilities

### 📚 Documentation

- *(security)* Add comprehensive security guide
- *(components)* Update component library README
- Update architecture documentation for multi-runtime support

### ⚙️ Miscellaneous Tasks

- Remove deprecated single-runtime templates
- Remove basic example in favor of runtime-specific examples

## [0.8.1] - 2025-11-30

### 🐛 Bug Fixes

- *(hmr)* Properly remove old stylesheets during hot-reload

## [0.8.0] - 2025-11-20

### 🚀 Features

- *(cli)* Add create command to scaffold new SXO projects
- *(templates)* Add starter project templates
- *(components/card)* [**breaking**] Simplify CardHeader to child-only API
- *(cli)* Improve create command prompts and next steps
- Remove aidev scaffolding comments

### 📚 Documentation

- Add create command to README quick start section
- Document create command in AGENTS.md quick start

### 🎨 Styling

- *(client)* Add trailing comma in lazy component map
- *(checkbox)* Wrap long helper text across lines

### 🧪 Testing

- *(cli)* Cover create command directory handling and messaging

## [0.7.0] - 2025-11-14

### 🚀 Features

- *(build)* Use esbuild metafile to populate per-route assets
- *(server)* Add runtime asset injection and integrate with dev/prod servers
- *(generator)* Integrate asset injection into HTML generation
- *(examples)* Add fragment demo page
- *(utils)* Add special page resolvers and SSR module loader
- *(esbuild)* Include special 404/500 server entries
- *(server)* Implement custom 404/500 handling with centralized SSR loading
- *(examples)* Add example 404 and 500 pages
- *(jsx)* Add JSX-aware scanner; integrate with transformer
- *(cli)* Add 'sxo add <component>' command to install basecoat components
- *(config)* Add componentsDir support with env/flags and validation
- *(transformer)* Improve whitespace trimming and attribute handling
- *(components)* Add collection of components
- *(components,a11y)* Improve dropdown focus management using details 'toggle'
- *(entries)* Collect multiple client entries; include global.css per route
- *(build)* [**breaking**] Support custom client config + server loaders
- *(performance)* Implement lazy loading for client components
- *(highlight)* Introduce new jsx syntax highlighter
- *(components)* Add loading prop to avatar
- *(components)* Simplify sidebar component
- *(components)* Update installation instructions
- *(components)* Update import paths to use aliases
- *(components)* Remove localStorage persistence from theme-selector
- *(a11y)* Enhance accessibility across core components
- *(a11y)* Improve accessibility in example pages
- *(components)* Adjust client component loading

### 🐛 Bug Fixes

- *(hot-replace)* Drop data-hr tagging and heuristic script cleanup
- *(esbuild)* Await renames in onEnd using Promise.all
- *(cli)* Validate URL protocol; prevent injection in open command
- *(dev)* Spawn esbuild with process.execPath for portability
- *(statics)* Validate raw path; decode safely in static asset handler
- Comment typo
- *(jsx)* Ignore JSX block comment-only expressions
- *(hot-reload)* Cache-bust stylesheet reloads with timestamp query
- *(cli)* Suppress logs under NODE_ENV=test to stabilize add tests
- *(cli)* Drop unsupported .script.js from addComponent extensions

### 💼 Other

- *(makefile)* Use pnpm tests in release gates; remove wasm-build target
- *(web)* Split build script and ensure public dir exists
- *(deps)* Update dependencies and scripts
- *(esbuild)* Update esbuild configuration
- *(components)* Refine components package scripts

### 🚜 Refactor

- [**breaking**] Remove head injection path and legacy asset extraction
- [**breaking**] Require full-document pages; remove shared index.html; update examples
- *(utils)* Inline exports in utils index file
- *(cli)* Simplify protocol validation in buildUrl
- *(generate)* Use centralized SSR module loader
- *(styling)* Refactor styling to a theme-based system

### 📚 Documentation

- Document full-document pages, fragments, and metafile-based asset injection
- *(agents)* Reference .rules/; add testing guidelines in AGENTS.md
- *(rules)* Add testing guidelines under .rules/testing.instructions.md
- *(rules)* Remove redundant BDD-style assertions section
- *(agents)* Document special 404/500 error pages
- *(readme)* Document custom 404/500 error pages
- *(agents)* Revamp AGENTS.md
- *(rules)* Add JSDoc reference and JSX examples standards
- *(agents)* Document build config + server loaders
- *(readme)* Document build config + server loaders; update tests
- *(agents)* Update AGENTS.md to reflect highlighter changes
- *(rules)* Add accessible names guidelines to JSX standards

### 🎨 Styling

- *(components)* Condense filter predicate formatting
- *(a11y)* Improve color contrast in example pages

### 🧪 Testing

- *(esbuild)* Add coverage for JSX plugin and metafile plugin
- *(generator)* Add unit test for generator behavior in full-HTML mode
- *(server)* Add runtime test for inject-assets
- *(jsx)* Adjust transformer/parser tests for JSX and array heuristics
- *(generator)* Adjust fragment behavior expectations in CLI tests
- *(statics)* Add tests for ETag, compression, range, caching headers
- *(hot-replace)* Validate SSE payload contract; PUBLIC_PATH normalization
- *(prod)* Add production server tests for generated, SSR routes
- *(statics)* Add If-Modified-Since conditional GET coverage
- *(server)* Add tests for module loader and error page HEAD requests
- *(jsx)* Add scanner tests; update transformer tests
- *(esbuild)* Add WASM transformer/scanner tests
- *(transformer)* Add/expand tests for helpers and transformer
- *(e2e)* Migrate toast tests to position-based categories
- *(e2e)* Adjust badge test
- *(e2e)* Adjust dropdown test
- *(cli)* Stabilize add.test.js environment and imports
- *(e2e)* Update playwright configuration for e2e tests

### ⚙️ Miscellaneous Tasks

- *(cli)* Adjust CLI helpers for metafile/asset injection flow
- *(config)* Align config with PUBLIC_PATH/clientDir behavior for asset injection
- *(deploy)* Add Cloudflare Workers web scaffold
- *(tooling)* Adjust Biome config and small build tweaks
- Remove legacy prompt.txt
- *(actions)* Add composite actions for Node+pnpm, Playwright, and wasm-bindgen
- *(workflows)* Add validation workflows
- *(deploy)* Add web deploy workflow
- *(release)* Add automated release workflow
- *(publish)* Add npm publish workflow
- *(components)* Configure Playwright webServer; simplify e2e scripts; update lockfile
- *(npm)* Add components helper scripts; set NODE_ENV for tests
- *(publish)* Remove build-wasm job
- *(web)* Remove build-wasm job
- *(web)* Change Cloudflare Wrangler action to v3 tag
- *(web)* Remove wrangler action
- *(build)* Bump esbuild; align components scripts; remove unused dev dependency
- *(build)* Remove stale comment in metafile plugin

## [0.6.1] - 2025-09-16

### 🐛 Bug Fixes

- *(js)* Robust comment removal in JSX transformer

### 🧪 Testing

- *(jsx)* Add tests for comment removal and JSX parsing edge cases

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
