# Security

SXO provides **foundational security controls** and leaves application-specific policy to you, via [middleware](server.md).

## Built-in Protections

What SXO provides automatically:

- **Path traversal protection** — static serving is confined to `dist/client`; `../`-style attempts are rejected (403/404)
- **Security headers** — `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` on production responses (the dev server does not add security headers)
- **HTML escaping utility** — `escapeHtml()` is used internally for error pages and injected content
- **Route slug validation** — dynamic parameter values must match `^[A-Za-z0-9._-]{1,200}$`
- **Static asset security** — MIME type restrictions, no directory listing
- **Secure file serving** — ETag/caching controls, `dist/server` never exposed
- **Node timeouts** — `HEADER_TIMEOUT_MS` / `REQUEST_TIMEOUT_MS` (default 120s) bound slow-loris style abuse

## Configuring Security Headers

Production responses carry these headers by default: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`. CSP and HSTS are deliberately not set (they need per-application tuning and HTTPS).

Add your own via the `securityHeaders` config key:

```json
{
  "securityHeaders": {
    "Content-Security-Policy": "default-src 'self'",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains"
  }
}
```

Or via the `SECURITY_HEADERS` environment variable (same JSON shape).

**Protected headers**: middleware responses are merged into the outgoing response, but `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, and `Referrer-Policy` set by middleware are ignored unless you opt in with `allowMiddlewareSecurityOverride` (config) or `ALLOW_MIDDLEWARE_SECURITY_OVERRIDE=true` (env). `Set-Cookie` is always appended, never replaced.

## Your Responsibility (via Middleware)

What you must implement:

- Authentication & authorization
- Session management
- CSRF protection
- Content Security Policy (CSP)
- Rate limiting
- Input validation (beyond route slugs)
- HTTPS/TLS configuration
- Application-specific security logging

## Escaping: The #1 App-Level Risk

The JSX transformer does **not** escape interpolated values — text children and attribute values are inserted raw, and `$bind-html` sets `innerHTML` directly. Any untrusted data (user input, database strings, third-party content) must be escaped at the render boundary:

```jsx
export function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// server page/component
<span>{escapeHtml(comment.body)}</span>
<a href={`/posts/${escapeHtml(slug)}`}>…</a>
```

The same applies to client-side rendering with `$bind-html` — escape before building HTML strings. Prefer `textContent`-style bindings (`$bind-text`, `$state`) where you don't need markup.

### Fragment swaps

[`swapFragment`](client.md#fragment-swaps) inserts the server response as HTML without sanitizing it. Escape every untrusted value on the server before rendering the fragment; SXO does not escape JSX interpolation. No same-origin check is applied, so trust and escaping remain the application's responsibility.

When embedding server state for hydration, escape the JSON payload too so it can't break out of its element:

```jsx
<div hidden $ref="data">{escapeHtml(JSON.stringify(state))}</div>
```

## Comprehensive Guide

See [SECURITY.md](../SECURITY.md) for in-depth guidance:

- Authentication patterns (JWT, sessions, OAuth/OIDC)
- Session management with secure cookies
- CSRF protection strategies
- Content Security Policy examples
- XSS prevention best practices
- Input validation patterns
- Secret management (environment variables, rotation)
- HTTPS/TLS setup for all platforms
- Rate limiting implementation
- Security headers reference
- Security testing checklist

## Quick Checklist

Before deploying to production:

- [ ] All secrets stored securely, never committed to git
- [ ] Application serves over HTTPS with valid certificates
- [ ] Authentication & session management implemented
- [ ] CSRF protection enabled for state-changing operations
- [ ] Content-Security-Policy header configured
- [ ] Rate limiting on sensitive endpoints (login, APIs)
- [ ] All user inputs validated and sanitized
- [ ] All untrusted output escaped at render time (server and client)
- [ ] Error messages don't expose sensitive data
- [ ] Dependencies audited (`npm audit` / `pnpm audit`)

## Reporting Security Issues

**Do not open public issues for security vulnerabilities.** Report responsibly via GitHub Security Advisories or by contacting the maintainers privately. See [SECURITY.md](../SECURITY.md#reporting-security-issues).
