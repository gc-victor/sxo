/**
 * Route: /500
 * Purpose: Intentionally throws during SSR to trigger a 500 and exercise the custom 500 error page.
 */
export default function Crash500Route() {
    throw new Error("Intentional crash from /500 to trigger the custom 500 page");
}
