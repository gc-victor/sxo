# Security

SXO provides **foundational security controls** and leaves application-specific policy to you, via [middleware](server.md).

## Built-in Protections

What SXO provides automatically:

- **Path traversal protection** — static serving is confined to `dist/client`; `../`-style attempts are rejected (403/404)
- **Security headers** — `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` on all responses
- **HTML escaping utility** — `escapeHtml()` is used internally for error pages and injected content
- **Route slug validation** — dynamic parameter values must match `^[A-Za-z0-9._-]{1,200}$`
- **Static asset security** — MIME type restrictions, no directory listing
- **Secure file serving** — ETag/caching controls, `dist/server` never exposed
- **Node timeouts** — `HEADER_TIMEOUT_MS` / `REQUEST_TIMEOUT_MS` (default 120s) bound slow-loris style abuse

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

The same applies to client-side rendering with `$bind-html` — escape before building HTML strings (see the [todo tutorial](tutorials/todo-app.md) `renderList`). Prefer `textContent`-style bindings (`$bind-text`, `$state`) where you don't need markup.

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
