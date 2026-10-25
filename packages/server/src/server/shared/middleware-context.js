/**
 * @fileoverview Middleware render context shared by the runtime and servers.
 */

import { injectAssets } from "../utils/inject-assets.js";

/**
 * Create a middleware context that renders pages and applies route assets.
 *
 * @param {object} options
 * @param {Record<string, { default?: Function, jsx?: Function }>} [options.modules]
 * @param {(jsxPath: string) => Function | Promise<Function>} [options.loadJsxModule]
 * @param {() => Array<{ jsx: string, assets?: { css?: string[], js?: string[] } }>} options.getRoutes
 * @param {() => string} options.getPublicPath
 * @returns {{ render: (jsxPath: string, params?: Record<string, string>) => Promise<string> }}
 */
export function createMiddlewareContext({ modules, loadJsxModule, getRoutes, getPublicPath }) {
    return {
        render: async (jsxPath, params = {}) => {
            const renderFn = loadJsxModule ? await loadJsxModule(jsxPath) : resolveModuleRenderFunction(modules, jsxPath);
            let html = await renderFn(params);
            if (typeof html !== "string") {
                html = String(html ?? "");
            }
            if (/^<html[\s>]/i.test(html)) {
                const route = getRoutes().find((entry) => entry.jsx === jsxPath);
                if (route?.assets) {
                    html = injectAssets(html, route.assets, getPublicPath());
                }
                html = `<!doctype html>\n${html}`;
            }
            return html;
        },
    };
}

/**
 * Resolve a page renderer from the runtime and production module map.
 *
 * @param {Record<string, { default?: Function, jsx?: Function }>} modules
 * @param {string} jsxPath
 * @returns {Function}
 */
export function resolveModuleRenderFunction(modules, jsxPath) {
    const mod = modules[jsxPath];
    if (!mod) {
        throw new Error(`Module not found: ${jsxPath}`);
    }
    const renderFn = mod.default || mod.jsx;
    if (typeof renderFn !== "function") {
        throw new Error(`No valid export found in ${jsxPath}`);
    }
    return renderFn;
}
