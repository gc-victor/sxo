/**
 * Shared production request-handler setup for the Node, Bun, and Deno adapters.
 * Runtime-specific route loading, module paths, importers, and server startup
 * remain in each adapter.
 *
 * @module server/prod/adapter-handler
 */

import { ALLOW_MIDDLEWARE_SECURITY_OVERRIDE, OUTPUT_DIR_CLIENT, SECURITY_HEADERS } from "../../constants.js";
import { loadUserDefinedMiddlewares } from "../middleware.js";
import { loadErrorPages } from "../shared/error-pages-loader.js";
import { createFileReader } from "../shared/file-readers.js";
import { loadModulesWithFallback } from "../shared/module-loader.js";
import { createStaticHandler } from "../shared/static-handler.js";
import { resolve404Page, resolve500Page } from "../utils/error-pages.js";
import { logger } from "../utils/logger.js";
import { createFetchHandler, createGeneratedRouteHandler, createProdHandler } from "./core-handler.js";

/**
 * Build the common request handler used by the Node, Bun, and Deno production
 * adapters.
 *
 * @param {{
 *   routes: any[],
 *   modulesPath: string,
 *   importer: (url: string) => Promise<any>,
 *   loadJsxModule: (jsxPath: string) => Promise<any>,
 *   publicPath: string
 * }} options
 * @returns {Promise<{handleFetch: (request: Request) => Promise<Response>}>}
 */
export async function createProductionFetchHandler({ routes, modulesPath, importer, loadJsxModule, publicPath }) {
    const modules = await loadModulesWithFallback({
        modulesPath,
        routes,
        importer,
        onWarn: (msg) => logger.warn(msg),
        onError: (msg) => logger.error(msg),
        isDev: false,
    });

    /** @type {Function[]} */
    let userMiddlewares = [];
    try {
        userMiddlewares = await loadUserDefinedMiddlewares();
    } catch (e) {
        logger.error({ err: e }, "Failed to load user-defined middleware");
    }

    const { render404, render500 } = await loadErrorPages({
        resolve404Page,
        resolve500Page,
        loadJsxModule,
        redactErrors: true,
    });

    const fileReader = createFileReader();
    const { handleRequest, send404, send500 } = createProdHandler({
        getRoutes: () => routes,
        modules,
        publicPath,
        getMiddleware: () => userMiddlewares,
        render404,
        render500,
        securityHeaders: SECURITY_HEADERS,
        allowMiddlewareSecurityOverride: ALLOW_MIDDLEWARE_SECURITY_OVERRIDE,
    });

    const handleStaticRequest = createStaticHandler({
        staticDir: OUTPUT_DIR_CLIENT,
        fileReader,
    });
    const serveGeneratedRoute = createGeneratedRouteHandler({
        staticDir: OUTPUT_DIR_CLIENT,
        fileReader,
        securityHeaders: SECURITY_HEADERS,
    });
    const handleFetch = createFetchHandler({
        handleStaticRequest,
        handleRequest,
        serveGeneratedRoute,
        send404,
        send500,
    });

    return { handleFetch };
}
