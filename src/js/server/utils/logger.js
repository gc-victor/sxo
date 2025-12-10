import pino from "pino";
import pinoHttp from "pino-http";
import pretty from "pino-pretty";

const isDev = process.env.NODE_ENV !== "production";

const RESET = "\x1b[0m";

// Create destination stream
let destination;
if (isDev) {
    destination = pretty({
        destination: process.stdout,
        colorize: true,
        ignore: "pid,hostname,req,res,responseTime",
        translateTime: "HH:MM:ss.l",
        messageFormat: (log, messageKey) => {
            if (log.req?.url && typeof log.responseTime !== "undefined") {
                return `${RESET}[ ${log.req.url} ] (${log.responseTime}ms)`;
            }
            return log[messageKey];
        },
        customPrettifiers: {
            levelLabel: (log) => (log.level === 30 ? "INFO" : log.level),
        },
    });
} else {
    destination = process.stdout;
}

// Logger (pretty only in dev)
export const logger = pino(
    {
        level: process.env.LOG_LEVEL || (isDev ? "debug" : "info"),
        redact: {
            paths: ["req.headers.authorization", "req.headers.cookie", "res.headers['set-cookie']"],
            remove: true,
            censor: "[REDACTED]",
        },
    },
    destination,
);

export const httpLogger = pinoHttp({
    logger,
    autoLogging: {
        ignore: (req) => {
            return req.url?.startsWith("/.well-known/");
        },
    },
    customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return "error";
        if (res.statusCode >= 400) return "warn";
        return "info";
    },
    customLogMessage: (req, res) => `[${req.method} ${req.url}] (${res.responseTime}ms)`,
    serializers: {
        req(req) {
            return {
                method: req.method,
                url: req.url,
                remoteAddress: req.socket?.remoteAddress,
            };
        },
        res(res) {
            return {
                statusCode: res.statusCode,
            };
        },
    },
});

/**
 * Creates a logger for Bun/Deno Web Standard Request/Response.
 * Call at request start, returns a function to call when response is ready.
 *
 * @param {Request} request - Web Standard Request object
 * @param {{ remoteAddress?: string }} [options] - Additional options
 * @returns {{ finish: (response: Response) => void, startTime: number }}
 */
function createWebLogger(request, options = {}) {
    const startTime = Date.now();
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
         * Call when response is ready to log the completed request
         * @param {Response} response - Web Standard Response object
         */
        finish(response) {
            const responseTime = Date.now() - startTime;
            const statusCode = response.status;

            const level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";

            logger[level](
                {
                    req: {
                        method: request.method,
                        url: pathname,
                        remoteAddress: options.remoteAddress,
                    },
                    res: {
                        statusCode,
                    },
                    responseTime,
                },
                `[${request.method} ${pathname}] (${responseTime}ms)`,
            );
        },
    };
}

/**
 * HTTP logger for Bun runtime using Web Standard Request/Response.
 *
 * @param {Request} request - Web Standard Request object
 * @param {import("bun").Server} [server] - Bun server instance for remote address
 * @returns {{ finish: (response: Response) => void, startTime: number }}
 * @example
 * const log = httpBunLogger(request, server);
 * const response = await handleRequest(request);
 * log.finish(response);
 * return response;
 */
export function httpBunLogger(request, server) {
    const remoteAddress = server?.requestIP?.(request)?.address;
    return createWebLogger(request, { remoteAddress });
}

/**
 * HTTP logger for Deno runtime using Web Standard Request/Response.
 *
 * @param {Request} request - Web Standard Request object
 * @param {Deno.ServeHandlerInfo} [info] - Deno serve handler info for remote address
 * @returns {{ finish: (response: Response) => void, startTime: number }}
 * @example
 * const log = httpDenoLogger(request, info);
 * const response = await handleRequest(request);
 * log.finish(response);
 * return response;
 */
export function httpDenoLogger(request, info) {
    const remoteAddress = info?.remoteAddr?.hostname;
    return createWebLogger(request, { remoteAddress });
}
