/**
 * @fileoverview Web Standard middleware executor for SXO runtime.
 *
 * This module re-exports the middleware executor from the core handler for
 * convenience. Middleware functions follow the Web Standard API signature:
 * `(request: Request, env?: object) => Response | void | Promise<Response | void>`
 *
 * @module sxo/runtime/middleware
 */

export { executeMiddleware } from "./handler.js";
