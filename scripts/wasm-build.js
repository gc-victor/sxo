import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

path.dirname(fileURLToPath(import.meta.url));
const LOG = "[rust-wasm]";

function sh(cmd, args, opts = {}) {
    const res = spawnSync(cmd, args, { stdio: "inherit", shell: true, ...opts });
    if (res.error) throw new Error(`${cmd} failed: ${res.error.message}`);
    if (res.status !== 0) throw new Error(`${cmd} exited with status ${res.status}`);
}

function ensureTarget() {
    try {
        const res = spawnSync("rustup", ["target", "list", "--installed"], { shell: true, encoding: "utf8" });
        const out = (res.stdout || "").toString();
        if (!out.includes("wasm32-unknown-unknown")) {
            sh("rustup", ["target", "add", "wasm32-unknown-unknown"]);
        }
    } catch {}
}

function parseCrateName(manifestPath) {
    const txt = readFileSync(manifestPath, "utf8");
    const pkgStart = txt.indexOf("[package]");
    if (pkgStart === -1) throw new Error(`Invalid Cargo.toml: missing [package] section at ${manifestPath}`);
    const rest = txt.slice(pkgStart);
    const nextSection = rest.indexOf("\n[");
    const pkgSection = nextSection === -1 ? rest : rest.slice(0, nextSection);
    const m = pkgSection.match(/^\s*name\s*=\s*"(.*?)"/m);
    if (!m) throw new Error(`Could not parse package.name in ${manifestPath}`);
    return m[1];
}

const crateDir = process.env.CRATE_DIR || ".";
const outNode = process.env.OUT_NODE || "jsx-transformer";

const crateRoot = path.resolve(process.cwd(), crateDir);
const manifest = path.join(crateRoot, "Cargo.toml");
if (!existsSync(manifest)) {
    console.error(`${LOG} Cargo.toml not found in ${crateRoot}`);
    process.exit(1);
}

try {
    ensureTarget();
    sh("cargo", ["build", "--release", "--target", "wasm32-unknown-unknown", "--manifest-path", manifest]);

    const crateName = parseCrateName(manifest);
    const wasmPath = path.join(crateRoot, "target", "wasm32-unknown-unknown", "release", `${crateName.replace(/-/g, "_")}.wasm`);
    if (!existsSync(wasmPath)) {
        throw new Error(`WASM not found at ${wasmPath}`);
    }

    const outNodeAbs = path.join(crateRoot, outNode);
    mkdirSync(outNodeAbs, { recursive: true });

    sh("wasm-bindgen", [wasmPath, "--target", "experimental-nodejs-module", "--out-dir", outNodeAbs]);

    console.log(`${LOG} Built ${crateName} -> ${outNodeAbs}`);
} catch (e) {
    console.error(`${LOG} Build failed: ${e.message}`);
    process.exit(1);
}
