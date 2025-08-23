import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveRuntimeConfig } from "./config.js";

const cfg = await resolveRuntimeConfig();

export const PORT = cfg.port;
export const PAGES_DIR = path.resolve(process.cwd(), cfg.pagesDir);
export const SRC_DIR = path.dirname(PAGES_DIR);
export const PAGES_RELATIVE_DIR = path.relative(process.cwd(), PAGES_DIR);
export const DANGER_OUTPUT_DIR = cfg.outDir;
export const OUTPUT_DIR_CLIENT = path.join(cfg.outDir, "client");
export const OUTPUT_DIR_SERVER = path.join(cfg.outDir, "server");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ESBUILD_CONFIG_FILE = path.resolve(__dirname, "esbuild/esbuild.config.js");
export const SERVER_DEV_FILE = path.resolve(__dirname, "server/dev.js");
export const SERVER_PROD_FILE = path.resolve(__dirname, "server/prod.js");
export const ROUTES_FILENAME = "routes.json";
export const ROUTES_FILE = path.resolve(OUTPUT_DIR_SERVER, ROUTES_FILENAME);
export const ROUTES_RELATIVE_PATH = path.relative(process.cwd(), path.join(OUTPUT_DIR_SERVER, ROUTES_FILENAME));
