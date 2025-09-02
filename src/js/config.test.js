import assert from "node:assert/strict";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { resolveConfig } from "./config.js";

const KEYS = ["PORT", "PAGES_DIR", "OUTPUT_DIR", "OPEN", "VERBOSE", "NO_COLOR", "MINIFY", "SOURCEMAP", "LOADERS"];

// Utility: run a function within an isolated temporary directory
async function withTempProject(fn) {
    const tmp = await fsp.mkdtemp(path.join(os.tmpdir(), "sxo-test-"));
    try {
        return await fn(tmp);
    } finally {
        // Cleanup temp directory
        try {
            await fsp.rm(tmp, { recursive: true, force: true, maxRetries: 2 });
        } catch {
            // ignore
        }
    }
}

// Utility: write text file, ensuring directories exist
async function writeFile(dir, rel, content) {
    const abs = path.join(dir, rel);
    await fsp.mkdir(path.dirname(abs), { recursive: true });
    await fsp.writeFile(abs, content, "utf8");
    return abs;
}

// Utility: capture and restore selected env keys
function withEnvCapture(fn) {
    const snapshot = {};
    for (const k of KEYS) {
        if (Object.hasOwn(process.env, k)) snapshot[k] = process.env[k];
    }
    return (async () => {
        try {
            return await fn();
        } finally {
            for (const k of KEYS) {
                if (Object.hasOwn(snapshot, k)) process.env[k] = snapshot[k];
                else delete process.env[k];
            }
        }
    })();
}

test("config: defaults and normalization for dev", async () => {
    await withTempProject(async (dir) => {
        await withEnvCapture(async () => {
            const cfg = await resolveConfig({ cwd: dir, command: "dev", flags: {} });

            // Defaults
            assert.equal(cfg.port, 3000);
            assert.equal(cfg.pagesDir, "src/pages");
            assert.equal(path.isAbsolute(cfg.outDir), true);
            assert.equal(cfg.outDir, path.resolve(dir, "dist"));

            // Command-aware defaults
            assert.equal(cfg.open, true); // dev defaults to open
            assert.equal(cfg.minify, true);
            assert.equal(cfg.sourcemap, true);

            // Color/verbose defaults
            assert.equal(cfg.verbose, false);
            assert.equal(typeof cfg.color, "boolean");
        });
    });
});

test("config: env precedence over defaults and normalization", async () => {
    await withTempProject(async (dir) => {
        await withEnvCapture(async () => {
            await writeFile(
                dir,
                ".env",
                ["PORT=4100", "PAGES_DIR=src/awesome", "OUTPUT_DIR=build", "OPEN=false", "MINIFY=false", "SOURCEMAP=true", ""].join("\n"),
            );

            const cfg = await resolveConfig({ cwd: dir, command: "dev", flags: {} });

            // env should override defaults
            assert.equal(cfg.port, 4100);
            assert.equal(cfg.pagesDir, "src/awesome");
            assert.equal(cfg.outDir, path.resolve(dir, "build"));
            assert.equal(cfg.open, false); // overrides dev's default true
            assert.equal(cfg.minify, false);
            assert.equal(cfg.sourcemap, true);
        });
    });
});

test("config: file precedence over env", async () => {
    await withTempProject(async (dir) => {
        await withEnvCapture(async () => {
            await writeFile(dir, ".env", "PORT=4100\nOPEN=false\n");
            await writeFile(
                dir,
                "sxo.config.json",
                JSON.stringify(
                    {
                        port: 4200,
                        pagesDir: "www/pages",
                        outDir: "out",
                        open: true,
                    },
                    null,
                    2,
                ),
            );

            const cfg = await resolveConfig({ cwd: dir, command: "start", flags: {} });

            // File should beat env
            assert.equal(cfg.port, 4200);
            assert.equal(cfg.pagesDir, "www/pages");
            assert.equal(cfg.outDir, path.resolve(dir, "out"));
            assert.equal(cfg.open, true); // start default is false, file sets true
        });
    });
});

test("config: flags precedence over file and normalization of paths", async () => {
    await withTempProject(async (dir) => {
        await withEnvCapture(async () => {
            // Prepare a file config with some baseline values
            await writeFile(
                dir,
                "sxo.config.json",
                JSON.stringify(
                    {
                        port: 4300,
                        pagesDir: "A/B",
                        outDir: "C",
                        open: false,
                        minify: false,
                        sourcemap: false,
                    },
                    null,
                    2,
                ),
            );

            // flags: provide absolute pages-dir which should normalize to relative,
            // and out-dir relative which should normalize to absolute
            const absPages = path.join(dir, "X", "Y");

            const cfg = await resolveConfig({
                cwd: dir,
                command: "build",
                flags: {
                    port: 4400,
                    "pages-dir": absPages,
                    "out-dir": "ZZ",
                    open: true,
                    minify: true,
                    sourcemap: true,
                },
            });

            // Flags should override file config
            assert.equal(cfg.port, 4400);
            assert.equal(cfg.pagesDir, "X/Y"); // normalized to posix relative
            assert.equal(cfg.outDir, path.resolve(dir, "ZZ")); // absolute
            assert.equal(cfg.open, true);
            assert.equal(cfg.minify, true);
            assert.equal(cfg.sourcemap, true);
        });
    });
});

test("config: invalid port clamps to fallback 3000", async () => {
    await withTempProject(async (dir) => {
        await withEnvCapture(async () => {
            await writeFile(dir, ".env", "PORT=0\n");
            const cfg = await resolveConfig({ cwd: dir, command: "start" });
            assert.equal(cfg.port, 3000);
        });
    });
});

test("config: open defaults by command", async () => {
    await withTempProject(async (dir) => {
        await withEnvCapture(async () => {
            const devCfg = await resolveConfig({ cwd: dir, command: "dev" });
            const previewCfg = await resolveConfig({ cwd: dir, command: "preview" });
            const startCfg = await resolveConfig({ cwd: dir, command: "start" });
            const buildCfg = await resolveConfig({ cwd: dir, command: "build" });

            assert.equal(devCfg.open, true);
            assert.equal(previewCfg.open, true);
            assert.equal(startCfg.open, false);
            assert.equal(buildCfg.open, false);
        });
    });
});

test("config: env mapping is prepared for spawn with normalized values", async () => {
    await withTempProject(async (dir) => {
        await withEnvCapture(async () => {
            await writeFile(dir, ".env", "PORT=4500\nPAGES_DIR=src/p\nOUTPUT_DIR=dist-out\nMINIFY=true\nSOURCEMAP=false\n");

            const dev = await resolveConfig({ cwd: dir, command: "dev" });
            const build = await resolveConfig({ cwd: dir, command: "build" });

            // DEV flag toggles by command
            assert.equal(dev.env.DEV, "true");
            assert.equal(build.env.DEV, "false");

            // Core env mappings
            assert.equal(dev.env.PORT, "4500");
            assert.equal(dev.env.PAGES_DIR, "src/p");
            // Output directory is now provided as separated client/server outputs.
            assert.equal(dev.env.OUTPUT_DIR_CLIENT, path.join(path.resolve(dir, "dist-out"), "client"));
            assert.equal(dev.env.OUTPUT_DIR_SERVER, path.join(path.resolve(dir, "dist-out"), "server"));

            // Build-related env present for dev/build
            assert.equal(dev.env.MINIFY, "true");
            assert.equal(build.env.MINIFY, "true");
            assert.equal(dev.env.SOURCEMAP, "false");
            assert.equal(build.env.SOURCEMAP, "false");
        });
    });
});

test("config: file overrides dev default (open:false beats default open:true)", async () => {
    await withTempProject(async (dir) => {
        await withEnvCapture(async () => {
            await writeFile(
                dir,
                "sxo.config.json",
                JSON.stringify(
                    {
                        open: false,
                    },
                    null,
                    2,
                ),
            );

            const cfg = await resolveConfig({ cwd: dir, command: "dev", flags: {} });
            assert.equal(cfg.open, false);
        });
    });
});

test("config: non-explicit flag does not override file (flagsExplicit prevents override)", async () => {
    await withTempProject(async (dir) => {
        await withEnvCapture(async () => {
            // file sets open: false
            await writeFile(
                dir,
                "sxo.config.json",
                JSON.stringify(
                    {
                        open: false,
                    },
                    null,
                    2,
                ),
            );

            // flags try to set open: true, but flagsExplicit marks it as not explicitly provided
            const cfg = await resolveConfig({
                cwd: dir,
                command: "dev",
                flags: { open: true },
                flagsExplicit: { open: false },
            });

            // file should win; open remains false
            assert.equal(cfg.open, false);
        });
    });
});

test("config: explicit flag overrides file (flagsExplicit allows override)", async () => {
    await withTempProject(async (dir) => {
        await withEnvCapture(async () => {
            // file sets open: false
            await writeFile(
                dir,
                "sxo.config.json",
                JSON.stringify(
                    {
                        open: false,
                    },
                    null,
                    2,
                ),
            );

            // flags set open: true and are marked explicit; flags should win
            const cfg = await resolveConfig({
                cwd: dir,
                command: "dev",
                flags: { open: true },
                flagsExplicit: { open: true },
            });

            assert.equal(cfg.open, true);
        });
    });
});

test("config: loaders from flags normalize and appear in env for build and dev", async () => {
    await withTempProject(async (dir) => {
        await withEnvCapture(async () => {
            const flags = { loader: "svg=file,ts=tsx" };

            const dev = await resolveConfig({ cwd: dir, command: "dev", flags });
            const build = await resolveConfig({ cwd: dir, command: "build", flags });

            assert.ok(dev.env.LOADERS);
            assert.ok(build.env.LOADERS);

            const expected = { ".svg": "file", ".ts": "tsx" };
            assert.deepEqual(JSON.parse(dev.env.LOADERS), expected);
            assert.deepEqual(JSON.parse(build.env.LOADERS), expected);
        });
    });
});

test("config: loaders from env JSON normalize; absent for start", async () => {
    await withTempProject(async (dir) => {
        await withEnvCapture(async () => {
            await writeFile(dir, ".env", 'LOADERS={".svg":"file"," ts":"tsx"}\n');

            const dev = await resolveConfig({ cwd: dir, command: "dev" });
            assert.ok(dev.env.LOADERS);
            assert.deepEqual(JSON.parse(dev.env.LOADERS), { ".svg": "file", ".ts": "tsx" });

            const start = await resolveConfig({ cwd: dir, command: "start" });
            assert.equal("LOADERS" in start.env, false);
        });
    });
});

test("config: loaders from file normalize and appear in env", async () => {
    await withTempProject(async (dir) => {
        await withEnvCapture(async () => {
            await writeFile(
                dir,
                "sxo.config.json",
                JSON.stringify(
                    {
                        loaders: {
                            svg: "file",
                            ".ts": "tsx",
                        },
                    },
                    null,
                    2,
                ),
            );

            const build = await resolveConfig({ cwd: dir, command: "build", flags: {} });
            assert.ok(build.env.LOADERS);
            assert.deepEqual(JSON.parse(build.env.LOADERS), { ".svg": "file", ".ts": "tsx" });
        });
    });
});
