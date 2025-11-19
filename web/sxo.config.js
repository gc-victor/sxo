/**
 * SXO config for the collection of components.
 * ESM default export is required by SXO's config resolution.
 *
 * Kept intentionally minimal and aligned with project conventions:
 * - clientDir: "client" to discover per-route client entries under <route>/client/index.*
 * - publicPath: "/" to serve public assets from the site root (SXO normalizes this at runtime)
 * - open: false to avoid auto-opening a browser in multi-example repos
 * - port: 3000 is the common default; adjust locally if it conflicts with another process
 */
export default {
    open: false,
    clientDir: "client",
    publicPath: "/",
    pagesDir: "../components/src/pages",
    outDir: "./dist",
};
