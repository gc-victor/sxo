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
