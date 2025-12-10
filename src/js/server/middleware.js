/**
 * Minimal middleware runner for Node http servers.
 *
 * Supports:
 * - async middleware: `async (req, res) => { ... }` (return truthy to short-circuit)
 * - sync middleware: `(req, res) => { ... }` (return truthy to short-circuit)
 * - callback-style middleware: `(req, res, next) => { ... }` where `next()` continues and `next(err)` rejects
 *
 * Contract:
 * - If a middleware handles the request (writes and ends the response) the runner returns `true`.
 * - If a middleware returns a truthy value the runner treats the request as handled and returns `true`.
 * - If all middleware run and none handled the request, the runner returns `false`.
 *
 * Lightweight, explicit runner used to sequence custom middleware functions.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { SRC_DIR } from "../constants.js";
import { logger } from "./utils/index.js";

export async function runMiddleware(req, res, middlewares = []) {
    if (!Array.isArray(middlewares) || middlewares.length === 0) return false;

    for (const mw of middlewares) {
        if (!mw) continue;

        // If the response is already finished, short-circuit immediately.
        if (res.writableEnded) return true;
        const handled = await invokeMiddleware(mw, req, res);

        // If middleware returned truthy, treat as handled.
        if (handled) return true;

        // If middleware finished the response (writableEnded), treat as handled.
        if (res.writableEnded) return true;
    }

    return false;
}

/**
 * Load user-defined middlewares from the pages directory middleware file.
 * Accepts:
 *   - default export: function or array
 *   - named export: middlewares / middleware / mw
 * Returns an array of middleware functions. Errors are logged (if logger provided) and result in [].
 * Centralized loader used by dev and prod servers to avoid duplication.
 *
 * Supports multiple file extensions (checked in priority order):
 *   - .js (most common, backwards compatible)
 *   - .ts (TypeScript)
 *   - .mjs (ES modules)
 *
 * @returns {Promise<Function[]>}
 */
export async function loadUserDefinedMiddlewares() {
    const srcDir = SRC_DIR;
    if (!srcDir) return [];

    // Try multiple extensions in priority order
    const extensions = [".js", ".ts", ".mjs"];
    let userMwPath = null;

    for (const ext of extensions) {
        const candidatePath = path.resolve(srcDir, `middleware${ext}`);
        if (fs.existsSync(candidatePath)) {
            userMwPath = candidatePath;
            break; // Use first match
        }
    }

    if (!userMwPath) return [];

    try {
        const url = `${pathToFileURL(userMwPath).href}?t=${Date.now()}`;
        const mod = await import(url);
        const exported = mod.default ?? mod.middlewares ?? mod.middleware ?? mod.mw;
        if (Array.isArray(exported)) {
            return exported.filter((f) => typeof f === "function");
        }
        if (typeof exported === "function") {
            return [exported];
        }
        return [];
    } catch (e) {
        if (logger && typeof logger.error === "function") {
            logger.error({ err: e }, "Failed to load user middleware");
        } else {
            console.error("Failed to load user middleware", e);
        }
        return [];
    }
}
/**
 * Invoke a single middleware, supporting:
 * - (req, res) => value | Promise
 * - (req, res, next) => void (call next() or next(err))
 *
 * Returns a Promise that resolves to the return value of the middleware (or the value passed to next),
 * or `undefined` if nothing was returned/called (but response may still be ended).
 *
 * @param {Function} mw
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<unknown>}
 */
function invokeMiddleware(mw, req, res) {
    // Callback-style middleware (3 args) is detected by function.length.
    if (typeof mw !== "function") {
        return Promise.resolve(undefined);
    }

    if (mw.length >= 3) {
        // Node-style (req, res, next)
        return new Promise((resolve, reject) => {
            let called = false;

            function next(err, value) {
                if (called) return;
                called = true;
                if (err) return reject(err);
                return resolve(value);
            }

            try {
                // Support middleware that returns a promise AND calls next:
                // we still prefer the explicit next() resolution.
                const maybe = mw(req, res, next);
                // If the middleware returns a Promise and never calls next, use that promise.
                if (!called && maybe && typeof maybe.then === "function") {
                    maybe
                        .then((v) => {
                            if (!called) resolve(v);
                        })
                        .catch((e) => {
                            if (!called) reject(e);
                        });
                }
            } catch (err) {
                reject(err);
            }
        });
    }

    // Simple sync/async (req, res) => value|Promise
    try {
        const result = mw(req, res);
        if (result && typeof result.then === "function") {
            return result;
        }
        return Promise.resolve(result);
    } catch (err) {
        return Promise.reject(err);
    }
}
