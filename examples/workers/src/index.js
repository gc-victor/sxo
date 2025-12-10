import { createHandler } from "sxo/cloudflare";
import middleware from "./middleware.js";

// Routes and modules are auto-resolved via wrangler.jsonc aliases:
// - sxo:routes -> ./dist/server/routes.json
// - sxo:modules -> ./dist/server/modules.js
export default await createHandler({
    publicPath: "/",
    middleware,
});
