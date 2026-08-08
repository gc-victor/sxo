import pino from "pino";
import pinoHttp from "pino-http";
import pretty from "pino-pretty";

/**
 * @typedef {object} LoggerRequest
 * @property {string | undefined} [method] - HTTP method
 * @property {string | undefined} [url] - Request URL
 * @property {object} [socket] - Network socket
 * @property {string | undefined} [socket.remoteAddress] - Remote IP address
 */

/**
 * @typedef {object} LoggerResponse
 * @property {number} statusCode - HTTP status code
 */

/**
 * @typedef {{ [key: string]: unknown } & {
 *   level?: number,
 *   responseTime?: number,
 *   req?: LoggerRequest,
 *   res?: LoggerResponse
 * }} LogObject
 */

const RESET = "\x1b[0m";

/**
 * Format log messages for pretty printing.
 * Shows URL and response time for HTTP requests, otherwise shows the message value.
 * @param {LogObject} log - Log entry object
 * @param {string} messageKey - Key to extract message from
 * @returns {string} Formatted message
 */
export const messageFormat = (log, messageKey) => {
    const url = log.req?.url;
    const responseTime = log.responseTime;

    if (url && responseTime !== undefined) {
        return `${RESET}[ ${url} ] (${responseTime}ms)`;
    }

    const value = log[messageKey];
    return value !== undefined ? String(value) : "";
};

/**
 * Format level number as human-readable label.
 * Level 30 is shown as "INFO", others show the numeric level.
 * @param {unknown} _data - Level number
 * @param {string} _key - Label key
 * @param {LogObject} log - Log entry object
 * @returns {string} Level label
 */
export const levelLabel = (_data, _key, log) => {
    return log.level === 30 ? "INFO" : String(log.level);
};

/**
 * Create a log destination based on environment.
 * Dev mode uses pretty printing, production uses raw JSON.
 * @param {boolean} isDev - Whether to use dev mode formatting
 * @param {NodeJS.WritableStream} [stdout] - Output stream (defaults to process.stdout)
 * @returns {NodeJS.WritableStream} Destination stream
 */
export const createDestination = (isDev, stdout = process.stdout) => {
    if (!isDev) {
        return stdout;
    }

    return pretty({
        destination: stdout,
        colorize: true,
        ignore: "pid,hostname,req,res,responseTime",
        translateTime: "HH:MM:ss.l",
        messageFormat,
        customPrettifiers: { levelLabel },
    });
};

/**
 * Creates a pino logger instance.
 * @param {object} [options] - Logger options
 * @param {boolean} [options.isDev] - Force dev mode (defaults to NODE_ENV !== production)
 * @param {string} [options.logLevel] - Log level (defaults to LOG_LEVEL env or dev/prod default)
 * @param {NodeJS.WritableStream} [options.stdout] - Output stream (defaults to process.stdout)
 * @returns {Logger}
 */
export const createLogger = (options = {}) => {
    const isDev = options.isDev ?? process.env.NODE_ENV !== "production";
    const logLevel = options.logLevel ?? process.env.LOG_LEVEL ?? (isDev ? "debug" : "info");
    const stdout = options.stdout ?? process.stdout;

    return pino(
        {
            level: logLevel,
            redact: {
                paths: ["req.headers.authorization", "req.headers.cookie", "res.headers['set-cookie']"],
                remove: true,
                censor: "[REDACTED]",
            },
        },
        createDestination(isDev, stdout),
    );
};

// Create default singleton instance
export const logger = createLogger();

/**
 * Check if a request URL should be excluded from logging.
 * Well-known paths like /.well-known/ are ignored.
 * @param {LoggerRequest} req - Request object
 * @returns {boolean} Whether to ignore this request
 */
export const ignorePath = (req) => {
    return req.url?.startsWith("/.well-known/") ?? false;
};

/**
 * Determine log level based on response status and errors.
 * @param {LoggerRequest} _req - Request object (unused)
 * @param {LoggerResponse} res - Response object
 * @param {Error} [err] - Error if one occurred
 * @returns {"error" | "warn" | "info"} Log level
 */
export const customLogLevel = (_req, res, err) => {
    const statusCode = res.statusCode;

    if (err || statusCode >= 500) return "error";
    if (statusCode >= 400) return "warn";
    return "info";
};

/**
 * Format success message for HTTP requests.
 * @param {LoggerRequest} req - Request object
 * @param {LoggerResponse} _res - Response object (unused)
 * @param {number} responseTime - Request duration in milliseconds
 * @returns {string} Formatted message
 */
export const customSuccessMessage = (req, _res, responseTime) => {
    return `[${req.method} ${req.url}] (${responseTime}ms)`;
};

/**
 * Format error message for HTTP requests.
 * @param {LoggerRequest} req - Request object
 * @param {LoggerResponse} _res - Response object (unused)
 * @param {Error} error - Error that occurred
 * @returns {string} Formatted message
 */
export const customErrorMessage = (req, _res, error) => {
    return `[${req.method} ${req.url}] (${error.message})`;
};

/**
 * Serialize request for logging.
 * @param {LoggerRequest} req - Request object
 * @returns {{ method: string, url: string, remoteAddress: string | undefined }}
 */
export const reqSerializer = (req) => ({
    method: req.method ?? "",
    url: req.url ?? "",
    remoteAddress: req.socket?.remoteAddress,
});

/**
 * Serialize response for logging.
 * @param {LoggerResponse} res - Response object
 * @returns {{ statusCode: number }}
 */
export const resSerializer = (res) => ({
    statusCode: res.statusCode,
});

/** @type {import("pino-http").Options} */
const httpLoggerOptions = {
    logger: /** @type {import("pino").Logger<never>} */ (logger),
    autoLogging: { ignore: ignorePath },
    customLogLevel,
    customSuccessMessage,
    customErrorMessage,
    serializers: {
        req: reqSerializer,
        res: resSerializer,
    },
};

export const httpLogger = pinoHttp(httpLoggerOptions);

/**
 * Creates a logger for Bun/Deno Web Standard Request/Response.
 * Call at request start, returns a function to call when response is ready.
 * @param {Request} request - Web Standard Request object
 * @param {string} [remoteAddress] - Client IP address
 * @returns {{ finish: (response: Response) => void, startTime: number }}
 */
const createWebLogger = (request, remoteAddress) => {
    const startTime = Date.now();
    const { method } = request;
    const url = new URL(request.url);
    const pathname = url.pathname + url.search;

    // Skip logging for well-known paths
    if (pathname.startsWith("/.well-known/")) {
        return {
            startTime,
            finish: () => {},
        };
    }

    return {
        startTime,
        /**
         * Call when response is ready to log completed request
         * @param {Response} response - Web Standard Response object
         */
        finish(response) {
            const responseTime = Date.now() - startTime;
            const { status: statusCode } = response;

            const level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";

            logger[level](
                {
                    req: { method, url: pathname, remoteAddress },
                    res: { statusCode },
                    responseTime,
                },
                `[${method} ${pathname}] (${responseTime}ms)`,
            );
        },
    };
};

/**
 * HTTP logger for Deno runtime using Web Standard Request/Response.
 * @param {Request} request - Web Standard Request object
 * @param {{ remoteAddr?: { hostname: string } }} [info] - Deno serve handler info
 * @returns {{ finish: (response: Response) => void, startTime: number }}
 * @example
 * const log = httpDenoLogger(request, info);
 * const response = await handleRequest(request);
 * log.finish(response);
 * return response;
 */
export const httpDenoLogger = (request, info) => {
    const remoteAddress = info?.remoteAddr?.hostname;
    return createWebLogger(request, remoteAddress);
};
