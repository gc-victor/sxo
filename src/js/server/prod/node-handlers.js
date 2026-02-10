/**
 * @fileoverview Node.js-specific error handlers for the production server.
 *
 * Provides handlers for socket-level errors, unhandled rejections,
 * and uncaught exceptions.
 *
 * @module server/prod/node-handlers
 */

import { logger } from "../utils/logger.js";

/**
 * Handles socket-level errors (malformed requests, timeouts).
 *
 * @param {Error & {code?: string}} err - The error object.
 * @param {import("node:stream").Duplex} socket - The socket where the error occurred.
 */
export function handleClientError(err, socket) {
    // DEFENSIVE CODE: Socket-level error handling for malformed requests and timeouts.
    // Requires actual network-level errors (malformed HTTP, timeouts) to trigger.
    // Not testable via unit tests; validated via production monitoring.
    try {
        /** @type {NodeJS.ErrnoException | undefined} */
        const error = err;
        const isTimeout = error?.code === "ERR_HTTP_REQUEST_TIMEOUT" || (typeof err?.message === "string" && /timeout/i.test(err.message));

        if (isTimeout) {
            socket.end("HTTP/1.1 408 Request Timeout\r\nConnection: close\r\nContent-Length: 0\r\n\r\n");
        } else {
            logger.debug(
                {
                    err,
                    remoteAddress: /** @type {{remoteAddress?: string}} */ (socket).remoteAddress,
                    remotePort: /** @type {{remotePort?: number}} */ (socket).remotePort,
                    bytesRead: /** @type {{bytesRead?: number}} */ (socket).bytesRead,
                    bytesWritten: /** @type {{bytesWritten?: number}} */ (socket).bytesWritten,
                },
                "clientError: bad request, sending 400 and closing connection",
            );
            socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Length: 0\r\n\r\n");
        }
    } catch (e) {
        logger.warn({ err: e }, "clientError: failed to end socket cleanly");
    }
}

/**
 * Handles global unhandled Promise rejections.
 *
 * @param {any} reason - Rejection reason.
 */
export function handleUnhandledRejection(reason) {
    // DEFENSIVE CODE: Global error handler for unhandled Promise rejections.
    // Indicates programming error that should be fixed in application code.
    // Not testable via unit tests; validated via production monitoring.
    logger.error({ reason }, "Unhandled Rejection");
}

/**
 * Handles global uncaught exceptions.
 *
 * @param {Error} err - The error object.
 */
export function handleUncaughtException(err) {
    // DEFENSIVE CODE: Global error handler for uncaught exceptions.
    // Indicates programming error that should be fixed in application code.
    // Not testable via unit tests; validated via production monitoring.
    logger.error({ err }, "Uncaught Exception");
}
