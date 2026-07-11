/**
 * Index page — redirects to /installation via middleware.
 *
 * This page is never rendered directly. The middleware in src/middleware.js
 * intercepts requests to "/" and returns a 302 redirect.
 */
export default function IndexPage() {
    return null;
}
