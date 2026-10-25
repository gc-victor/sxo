#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const requiredDependencies = ["alien-signals", "cac", "esbuild", "pino", "pino-http", "pino-pretty"];
const forbiddenDependencies = new Set(["@sxo/client", "@sxo/server"]);
const wasmPath = "package/packages/cli/jsx-transformer/jsx_transformer_bg.wasm";

function checkTarball(tarball) {
    const files = execFileSync("tar", ["-tzf", tarball], { encoding: "utf8" })
        .split(/\r?\n/)
        .filter(Boolean);
    const manifests = files.filter((file) => file.endsWith("/package.json"));
    const errors = [];

    if (manifests.length === 0) errors.push("tarball contains no package.json manifests");
    if (!manifests.includes("package/package.json")) errors.push("tarball is missing package/package.json");
    if (!files.includes(wasmPath)) errors.push("tarball is missing jsx_transformer_bg.wasm");

    for (const manifest of manifests) {
        const content = execFileSync("tar", ["-xOzf", tarball, manifest], { encoding: "utf8" });
        if (/workspace:/.test(content)) errors.push(manifest + ": contains a workspace: specifier");
    }

    if (manifests.includes("package/package.json")) {
        const pkg = JSON.parse(execFileSync("tar", ["-xOzf", tarball, "package/package.json"], { encoding: "utf8" }));
        const fields = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];

        for (const field of fields) {
            for (const dep of Object.keys(pkg[field] ?? {})) {
                if (forbiddenDependencies.has(dep)) {
                    errors.push("root " + field + ": forbidden scoped dependency " + dep);
                }
            }
        }

        for (const dep of requiredDependencies) {
            if (!pkg.dependencies?.[dep]) errors.push("root dependencies: missing runtime dependency " + dep);
        }
    }

    return { errors, manifestCount: manifests.length };
}

const [tarball] = process.argv.slice(2);
if (!tarball) {
    console.error("Usage: node scripts/publish/check-manifests.mjs <tarball>");
    process.exit(2);
}

try {
    const { errors, manifestCount } = checkTarball(tarball);
    if (errors.length > 0) {
        for (const error of errors) console.error("::error::" + error);
        process.exit(1);
    }
    console.log("Tarball check OK (" + manifestCount + " manifest(s))");
} catch (error) {
    console.error("::error::Unable to check tarball: " + error.message);
    process.exit(1);
}
