/**
 * Example user-defined middlewares demonstrating every supported pattern.
 *
 * Detected automatically by the framework (see loadUserDefinedMiddlewares()).
 *
 * Supported forms (mixed freely):
 * 1. Synchronous: (req, res) => { ... }
 * 2. Async/Promise: async (req, res) => { ... }
 * 3. Callback / connect-style: (req, res, next) => { ...; next(); }
 *
 * Contract recap:
 * - Return (or resolve) a truthy value to signal "handled" (short-circuit further middleware & routing).
 * - OR write + end the response (res.writeHead(...); res.end(...)) which also signals handled.
 * - Otherwise return/resolve falsey (or call next()) to continue the chain.
 *
 * Order matters. Place logging / mutation early; terminal or blocking middleware near the end.
 *
 * This file is illustrative—keep it lightweight; real apps can split and re-import.
 */

import { IncomingMessage, ServerResponse } from "node:http";
import { cors } from "./middleware/cors.js";

/**
 * Simple request logger (sync).
 * Adds a high-resolution start time symbol on the request for later middlewares.
 * @param {IncomingMessage} req Incoming HTTP request.
 * @returns {void} Returns undefined to allow the middleware chain to continue.
 */
// function requestLogger(req) {
//     console.log(`[mw:logger] ${req.method} ${req.url}`);
//     // @ts-expect-error: Attach custom property for middleware timing
//     req.__mwStart = process.hrtime.bigint();
// }

/**
 * Add a custom header demonstrating mutation (async to show awaited form).
 *
 * @param {IncomingMessage} _ - Incoming HTTP request (unused).
 * @param {ServerResponse} res - HTTP response object.
 * @returns {Promise<void>} Returns a promise that resolves when the middleware is done.
 */
async function customHeader(_, res) {
    res.setHeader("x-example-middleware", "true");
    // Simulate an async side effect without delaying too long.
    await Promise.resolve();
    // Continue chain.
}

/**
 * Fast in-process health check endpoint.
 * If the request is GET /healthz we answer immediately and short-circuit by returning `true`.
 *
 * @param {IncomingMessage} req - Incoming HTTP request.
 * @param {ServerResponse} res - HTTP response object.
 * @returns {boolean|undefined} Returns `true` if handled, otherwise undefined to continue the middleware chain.
 */
function healthCheck(req, res) {
    if (req.method === "GET" && req.url === "/healthz") {
        res.writeHead(204); // No Content
        res.end();
        return true; // Signal handled.
    }
}

/**
 * Simple 200 OK endpoint for GET /okay.
 * Responds with a plain text "OK" message.
 *
 * @param {IncomingMessage} req - Incoming HTTP request.
 * @param {ServerResponse} res - HTTP response object.
 * @returns {boolean|undefined} Returns `true` if handled, otherwise undefined to continue the middleware chain.
 */
function ok(req, res) {
    if (req.method === "GET" && req.url === "/ok") {
        res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
        res.end("OK");
        return true;
    }
}

/**
 * Callback-style middleware (req, res, next).
 * Demonstrates using `next(err)` to abort the chain.
 *
 * @param {IncomingMessage} req - Incoming HTTP request.
 * @param {ServerResponse} res - HTTP response object.
 * @param {(err?: Error) => void} next - Callback to pass control to the next middleware. Call with an error to abort the chain.
 */
// function callbackStyleExample(req, res, next) {
//     // Reject suspicious query tokens (purely illustrative).
//     if (typeof req.url === "string" && req.url.includes("DROP TABLE")) {
//         // By passing an Error to next, runMiddleware will reject and upstream code can decide how to surface it.
//         return next(new Error("Suspicious request rejected by middleware."));
//     }
//     // Attach a trailing duration header when response finishes.
//     // @ts-ignore
//     const start = req.__mwStart ?? process.hrtime.bigint();
//     res.once("finish", () => {
//         const ns = Number(process.hrtime.bigint() - start);
//         // Cannot set headers after finish, but we could have set just before end normally.
//         // Here we just log to keep it simple.
//         console.log(`[mw:cb] duration ~${Math.round(ns / 1_000_000)}ms for ${req.method} ${req.url}`);
//     });

//     next(); // Continue.
// }

export default [
    // requestLogger,
    cors,
    customHeader,
    healthCheck,
    ok,
    // callbackStyleExample,
];

/**
 * You may also export named variants if you prefer:
 *   export const middlewares = [...];
 * The loader checks: default, middlewares, middleware, mw.
 */
