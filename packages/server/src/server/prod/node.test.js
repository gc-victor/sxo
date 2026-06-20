/**
 * @fileoverview Tests for Node.js production server adapter.
 *
 * Tests the Node.js-specific production server adapter including
 * server error handling, clientError handling, and socket cleanup.
 *
 * @module server/prod/node.test
 */

import assert from "node:assert/strict";
import { beforeEach, describe, it, mock } from "node:test";
import { logger } from "../utils/logger.js";
import { handleClientError, handleUncaughtException, handleUnhandledRejection } from "./node-handlers.js";

describe("Node.js production server", () => {
    describe("unhandledRejection handler", () => {
        /** @type {import("node:test").MockMethod | undefined} */
        let errorMock;

        beforeEach(() => {
            if (errorMock) {
                errorMock.mock.restore();
            }
            errorMock = mock.method(logger, "error", () => {});
        });

        describe("when promise rejects with Error object", () => {
            it("should log error details with reason and message", () => {
                const error = new Error("Database connection failed");

                handleUnhandledRejection(error);

                assert.strictEqual(errorMock.mock.callCount(), 1, "should call logger.error once");
                const logCall = errorMock.mock.calls[0];
                assert.strictEqual(logCall.arguments[1], "Unhandled Rejection", "should log 'Unhandled Rejection' message");
                assert.ok(logCall.arguments[0], "should log error object");
                assert.strictEqual(logCall.arguments[0].reason, error, "should include rejection reason");
            });
        });

        describe("when promise rejects without reason (undefined)", () => {
            it("should log undefined reason without throwing", () => {
                handleUnhandledRejection(undefined);

                assert.strictEqual(errorMock.mock.callCount(), 1, "should call logger.error once");
                const logCall = errorMock.mock.calls[0];
                assert.strictEqual(logCall.arguments[1], "Unhandled Rejection", "should log 'Unhandled Rejection' message");
                assert.strictEqual(logCall.arguments[0].reason, undefined, "should include undefined reason");
            });
        });

        describe("when promise rejects with null", () => {
            it("should log null reason without throwing", () => {
                handleUnhandledRejection(null);

                assert.strictEqual(errorMock.mock.callCount(), 1, "should call logger.error once");
                const logCall = errorMock.mock.calls[0];
                assert.strictEqual(logCall.arguments[1], "Unhandled Rejection", "should log 'Unhandled Rejection' message");
                assert.strictEqual(logCall.arguments[0].reason, null, "should include null reason");
            });
        });

        describe("when promise rejects with string reason", () => {
            it("should log string reason and message", () => {
                const reason = "API timeout occurred";

                handleUnhandledRejection(reason);

                assert.strictEqual(errorMock.mock.callCount(), 1, "should call logger.error once");
                const logCall = errorMock.mock.calls[0];
                assert.strictEqual(logCall.arguments[1], "Unhandled Rejection", "should log 'Unhandled Rejection' message");
                assert.strictEqual(logCall.arguments[0].reason, reason, "should include string reason");
            });
        });
    });

    describe("clientError handler", () => {
        /** @type {import("node:test").MockMethod} */
        let debugMock;
        /** @type {import("node:test").MockMethod} */
        let warnMock;

        beforeEach(() => {
            if (debugMock) {
                debugMock.mock.restore();
            }
            if (warnMock) {
                warnMock.mock.restore();
            }
            debugMock = mock.method(logger, "debug", () => {});
            warnMock = mock.method(logger, "warn", () => {});
        });

        /**
         * Create a mock socket with end method that captures calls.
         */
        function createMockSocket() {
            const endCalls = [];
            return {
                end: (data) => {
                    endCalls.push(data);
                },
                remoteAddress: "127.0.0.1",
                remotePort: 12345,
                bytesRead: 1024,
                bytesWritten: 2048,
                _getEndCalls: () => endCalls,
            };
        }

        describe("when error code is ERR_HTTP_REQUEST_TIMEOUT", () => {
            it("should send 408 Request Timeout response and close socket", () => {
                const socket = createMockSocket();
                const error = new Error("Request timeout");
                error.code = "ERR_HTTP_REQUEST_TIMEOUT";

                handleClientError(error, socket);

                const endCalls = socket._getEndCalls();
                assert.strictEqual(endCalls.length, 1, "should call socket.end once");
                assert.ok(endCalls[0].includes("HTTP/1.1 408 Request Timeout"), "should send 408 response");
                assert.strictEqual(debugMock.mock.callCount(), 0, "should not log timeout errors");
            });
        });

        describe("when error message contains timeout (case-insensitive)", () => {
            it("should send 408 Request Timeout response", () => {
                const socket = createMockSocket();
                const error = new Error("Client timeout exceeded");

                handleClientError(error, socket);

                const endCalls = socket._getEndCalls();
                assert.strictEqual(endCalls.length, 1, "should call socket.end once");
                assert.ok(endCalls[0].includes("HTTP/1.1 408 Request Timeout"), "should send 408 response");
                assert.strictEqual(debugMock.mock.callCount(), 0, "should not log timeout errors");
            });

            it("should send 408 for TIMEOUT (uppercase)", () => {
                const socket = createMockSocket();
                const error = new Error("TIMEOUT occurred");

                handleClientError(error, socket);

                const endCalls = socket._getEndCalls();
                assert.strictEqual(endCalls.length, 1, "should call socket.end once");
                assert.ok(endCalls[0].includes("HTTP/1.1 408 Request Timeout"), "should send 408 response");
            });
        });

        describe("when error is a generic client error", () => {
            it("should log error details and send 400 Bad Request", () => {
                const socket = createMockSocket();
                const error = new Error("Malformed HTTP request");

                handleClientError(error, socket);

                const endCalls = socket._getEndCalls();
                assert.strictEqual(endCalls.length, 1, "should call socket.end once");
                assert.ok(endCalls[0].includes("HTTP/1.1 400 Bad Request"), "should send 400 response");

                // Verify logging
                assert.strictEqual(debugMock.mock.callCount(), 1, "should log debug message");
                const logCall = debugMock.mock.calls[0];
                assert.strictEqual(logCall.arguments[1], "clientError: bad request, sending 400 and closing connection");
                assert.ok(logCall.arguments[0], "should log error object");
                assert.strictEqual(logCall.arguments[0].err, error, "should include error in log");
                assert.strictEqual(logCall.arguments[0].remoteAddress, "127.0.0.1", "should include remote address");
                assert.strictEqual(logCall.arguments[0].remotePort, 12345, "should include remote port");
                assert.strictEqual(logCall.arguments[0].bytesRead, 1024, "should include bytes read");
                assert.strictEqual(logCall.arguments[0].bytesWritten, 2048, "should include bytes written");
            });
        });

        describe("when error has no specific code or message", () => {
            it("should send 400 Bad Request and log generic error", () => {
                const socket = createMockSocket();
                const error = new Error("Unknown socket error");

                handleClientError(error, socket);

                const endCalls = socket._getEndCalls();
                assert.strictEqual(endCalls.length, 1, "should call socket.end once");
                assert.ok(endCalls[0].includes("HTTP/1.1 400 Bad Request"), "should send 400 response");
                assert.strictEqual(debugMock.mock.callCount(), 1, "should log error");
            });
        });

        describe("when socket cleanup fails", () => {
            it("should log warning and not crash", () => {
                const error = new Error("Malformed HTTP request");

                // Create a socket that throws on end
                const socket = createMockSocket();
                socket.end = () => {
                    throw new Error("Socket write failed");
                };

                handleClientError(error, socket);

                assert.strictEqual(warnMock.mock.callCount(), 1, "should log warning");
                const warnCall = warnMock.mock.calls[0];
                assert.strictEqual(warnCall.arguments[1], "clientError: failed to end socket cleanly");
                assert.ok(warnCall.arguments[0], "should include error object in warning log");
                assert.ok(warnCall.arguments[0].err, "should include error in warning");
            });
        });

        describe("response format validation", () => {
            it("should include Connection: close header in 408 response", () => {
                const socket = createMockSocket();
                const error = new Error("timeout");
                error.code = "ERR_HTTP_REQUEST_TIMEOUT";

                handleClientError(error, socket);

                const endCalls = socket._getEndCalls();
                assert.ok(endCalls[0].includes("Connection: close"), "should include Connection: close header");
                assert.ok(endCalls[0].includes("Content-Length: 0"), "should include Content-Length: 0 header");
            });

            it("should include Connection: close header in 400 response", () => {
                const socket = createMockSocket();
                const error = new Error("Bad request");

                handleClientError(error, socket);

                const endCalls = socket._getEndCalls();
                assert.ok(endCalls[0].includes("Connection: close"), "should include Connection: close header");
                assert.ok(endCalls[0].includes("Content-Length: 0"), "should include Content-Length: 0 header");
            });
        });
    });

    describe("uncaughtException handler", () => {
        /** @type {import("node:test").MockMethod | undefined} */
        let errorMock;

        beforeEach(() => {
            if (errorMock) {
                errorMock.mock.restore();
            }
            errorMock = mock.method(logger, "error", () => {});
        });

        describe("when an uncaught exception occurs with error object", () => {
            it("should log error with 'Uncaught Exception' message", () => {
                const error = new Error("Unexpected error occurred");

                handleUncaughtException(error);

                assert.strictEqual(errorMock.mock.callCount(), 1, "should call logger.error once");
                const logCall = errorMock.mock.calls[0];
                assert.strictEqual(logCall.arguments[1], "Uncaught Exception", "should log 'Uncaught Exception' message");
                assert.ok(logCall.arguments[0], "should log error object");
                assert.strictEqual(logCall.arguments[0].err, error, "should include error in log");
            });
        });

        describe("when an uncaught exception occurs with custom error message", () => {
            it("should log specific error message correctly", () => {
                const error = new Error("Database connection failed: timeout after 30s");

                handleUncaughtException(error);

                assert.strictEqual(errorMock.mock.callCount(), 1, "should call logger.error once");
                const logCall = errorMock.mock.calls[0];
                assert.strictEqual(logCall.arguments[1], "Uncaught Exception", "should log 'Uncaught Exception' message");
                assert.strictEqual(
                    logCall.arguments[0].err.message,
                    "Database connection failed: timeout after 30s",
                    "should include specific error message",
                );
            });
        });

        describe("when an uncaught exception occurs without error object", () => {
            it("should log undefined error gracefully", () => {
                handleUncaughtException(undefined);

                assert.strictEqual(errorMock.mock.callCount(), 1, "should call logger.error once");
                const logCall = errorMock.mock.calls[0];
                assert.strictEqual(logCall.arguments[1], "Uncaught Exception", "should log 'Uncaught Exception' message");
                assert.strictEqual(logCall.arguments[0].err, undefined, "should include undefined error");
            });
        });
    });
});
