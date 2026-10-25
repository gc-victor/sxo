#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const pkgDir = path.join(process.cwd(), "node_modules", "sxo");
const pkg = JSON.parse(readFileSync(path.join(pkgDir, "package.json"), "utf8"));
if (!pkg.exports || typeof pkg.exports !== "object") {
    throw new Error("installed sxo package has no exports map");
}

const errors = [];
for (const key of Object.keys(pkg.exports)) {
    const specifier = "sxo" + key.slice(1);
    try {
        const resolved = import.meta.resolve(specifier);
        const url = new URL(resolved);
        if (url.protocol !== "file:") {
            errors.push(specifier + " resolved to non-file URL " + resolved);
            continue;
        }

        const filePath = fileURLToPath(url);
        const relativePath = path.relative(pkgDir, filePath);
        if (relativePath.startsWith(".." + path.sep) || relativePath === ".." || path.isAbsolute(relativePath) || !existsSync(filePath)) {
            errors.push(specifier + " resolved to " + resolved + " (outside the installed package or missing)");
        }
    } catch (error) {
        errors.push(specifier + " could not be resolved: " + error.message);
    }
}

if (errors.length > 0) {
    for (const error of errors) console.error("::error::" + error);
    process.exit(1);
}
console.log("Export resolution OK (" + Object.keys(pkg.exports).length + " exports)");
