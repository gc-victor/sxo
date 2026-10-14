# Configuration

## Precedence

```
CLI flags  >  sxo.config.*  >  environment variables  >  defaults
```

Flags only override when **explicitly** passed (`--open`, `--no-open`, `--open=false`); inferred/defaulted flags are filtered out.

Command defaults for `open`: dev `true`, build/start `false`.

## Config File

`sxo.config.json` or `sxo.config.js` (ESM `export default`) in the project root:

```json
{
  "port": 4000,
  "pagesDir": "src/pages",
  "componentsDir": "src/components",
  "outDir": "dist",
  "open": false,
  "build": {
    "minify": false,
    "sourcemap": "inline"
  },
  "loaders": { ".svg": "file" }
}
```

```javascript
/** @type {import('sxo').SXOConfig} */
export default {
  open: false,
  pagesDir: "src/pages",
  outDir: "dist",
  client: {
    minify: process.env.NODE_ENV === "production",
    sourcemap: process.env.NODE_ENV === "development" ? "inline" : false,
  },
  i18n: {
    defaultLang: "en",
    supportedLangs: ["en", "es"],
    langsDir: "src/langs",
  },
};
```

### `build` / `client` property

Accepts esbuild options for the **client build only**. SXO defaults: `minify: true`, `sourcemap: isDev ? "inline" : false`.

The **server build** uses its own hardcoded defaults (`minify: true`, `sourcemap: false`) and is not affected by this property.

## CLI Flags

```shell
--port <number>             # Server port (dev/start). Default: 3000
--pages-dir <path>          # Pages directory. Default: src/pages
--out-dir <path>            # Output directory. Default: dist
--open / --no-open          # Auto-open browser on dev ready
--public-path <path>        # Public base URL for assets. Default: "/"; "" preserved (relative URLs)
--client-dir <name>         # Per-route client entry subdirectory. Default: client
--components-dir <path>     # Components dir for 'sxo add'. Default: src/components
--loaders <ext=loader>      # esbuild server loaders (dev/build); repeatable or comma-separated
--verbose                   # Verbose logging
--no-color                  # Disable ANSI colors
```

## Environment Variables

Recognized (read from the process environment):

| Variable | Meaning | Default |
| -------- | ------- | ------- |
| `PORT` | Port | `3000` |
| `PAGES_DIR` | Pages directory | `src/pages` |
| `OUTPUT_DIR` | Base output directory | `dist` |
| `OPEN` | Auto-open dev browser | `true` (dev) |
| `PUBLIC_PATH` | Public base URL for asset URLs (esbuild publicPath). Empty string allowed and preserved | `/` |
| `CLIENT_DIR` | Per-route client entry subdirectory name | `client` |
| `COMPONENTS_DIR` | Components directory used by `sxo add` | `src/components` |
| `LOADERS` | esbuild server loaders as a JSON map (e.g., `{"svg":"file"}` or `{".ts":"tsx"}`) | unset |
| `VERBOSE` | Verbose logging | `false` |
| `NO_COLOR` | Disable colorized output | unset |
| `HEADER_TIMEOUT_MS` | Node `server.headersTimeout` in ms; non-negative integer | Node default |
| `REQUEST_TIMEOUT_MS` | Node `server.requestTimeout` in ms | `120000` |

Loaders can also be set per invocation:

```shell
LOADERS='{"svg":"file",".ts":"tsx"}' sxo dev
sxo build --loaders "svg=file,ts=tsx"
```

Derived / injected by SXO:

| Variable | Meaning |
| -------- | ------- |
| `OUTPUT_DIR_CLIENT` | `<outDir>/client` |
| `OUTPUT_DIR_SERVER` | `<outDir>/server` |
| `SXO_RESOLVED_CONFIG` | JSON blob of the resolved config |
| `DEV` | `"true"` in dev, else `"false"` |
| `SXO_COMMAND` | Current command (`dev\|build\|start\|clean`) |
| `BUILD` | Custom esbuild client config propagated to the child build process (dev/build) |
| `LOADERS` | Server loaders map propagated to the child build process (dev/build) |
| `PUBLIC_PATH` | Propagated to the build (defaults to `/`; empty string preserved) |
| `CLIENT_DIR` | Configured per-route client entry subdirectory name |
