// Barrel exports for server utils.
// AIDEV-NOTE: Modular barrel referencing the fully split utility modules.
// Legacy monolith (../utils.js) is no longer imported; all symbols now come
// from dedicated files. Compatibility aliases (injectAppContent, jsxSrcToDist,
// extractLinkTag) are preserved for existing callers & tests.

import { DIV_APP_REGEX, escapeHtml, renderErrorHtml, TITLE_REGEX } from "./html-utils.js";
import { jsxBundlePath } from "./jsx-bundle-path.js";
import { httpLogger, logger } from "./logger.js";

export { injectAssets, injectCss, injectJs, normalizePublicPath } from "./inject-assets.js";

import { routeMatch, SLUG_REGEX } from "./route-match.js";
import { statics } from "./statics.js";

export {
    DIV_APP_REGEX,
    TITLE_REGEX,
    SLUG_REGEX,
    routeMatch,
    escapeHtml,
    renderErrorHtml,
    jsxBundlePath,
    statics,
    httpLogger,
    logger,
};
