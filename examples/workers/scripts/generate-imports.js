#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

// Read the routes manifest
const manifestPath = path.join(projectRoot, "dist/server/routes.json");
const routes = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

// Generate import statements and module map
const imports = [];
const moduleMapEntries = [];

routes.forEach((route, index) => {
    const varName = `module_${index}`;

    // Convert jsx path to server build path
    // e.g., "src/pages/about/index.jsx" -> "about/index.js"
    let serverPath = route.jsx.replace(/\.(jsx|tsx)$/i, ".js");
    if (serverPath.startsWith("src/pages/")) {
        serverPath = serverPath.replace("src/pages/", "");
    }

    imports.push(`import * as ${varName} from "../dist/server/${serverPath}";`);
    moduleMapEntries.push(`    "${route.jsx}": ${varName}`);
});

// Read the worker template
const templatePath = path.join(__dirname, "index.js");
const template = fs.readFileSync(templatePath, "utf-8");

// Generate the worker source file by replacing placeholders
const workerSource = template
    .replace("{{GENERATED_AT}}", new Date().toISOString())
    .replace("// {{IMPORTS}}", imports.join("\n"))
    .replace("// {{MODULE_MAP}}", moduleMapEntries.join(",\n"));

// Write the generated worker file
const outputPath = path.join(projectRoot, "src/index.generated.js");
fs.writeFileSync(outputPath, workerSource);

console.log(`■ Generated worker with ${routes.length} routes at: ${path.relative(process.cwd(), outputPath)}`);
console.log("Routes included:");
routes.forEach((route) => {
    console.log(`  - ${route.jsx} -> ${route.path || "/"}`);
});
