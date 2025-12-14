// Barrel exports for server utils.
// Modular barrel referencing the fully split utility modules.
// Legacy monolith (../utils.js) is no longer imported; all symbols now come
// from dedicated files. Compatibility aliases (injectAppContent, jsxSrcToDist,
// extractLinkTag) are preserved for existing callers & tests.

import { DIV_APP_REGEX, escapeHtml, renderErrorHtml } from "./html-utils.js";
import { jsxBundlePath } from "./jsx-bundle-path.js";
import { httpBunLogger, httpDenoLogger, httpLogger, logger } from "./logger.js";

export {
    resolve404Page,
    resolve500Page,
} from "./error-pages.js";
export { injectAssets, injectCss, injectJs, normalizePublicPath } from "./inject-assets.js";
export { loadJsxModule } from "./load-jsx-module.js";

import { routeMatch, SLUG_REGEX, validateRoutePattern } from "./route-match.js";

/**
 * Validates route pattern parameter names (must start with letter, alphanumeric + underscore, unique).
 * @see route-match.js for full documentation
 */
export {
    DIV_APP_REGEX,
    SLUG_REGEX,
    routeMatch,
    validateRoutePattern,
    escapeHtml,
    renderErrorHtml,
    jsxBundlePath,
    httpBunLogger,
    httpDenoLogger,
    httpLogger,
    logger,
};
