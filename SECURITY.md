# Security Guide

This document provides comprehensive security guidance for building secure applications with SXO. SXO is a minimal server-side JSX framework that provides **foundational security controls** but requires developers to implement application-specific security features through middleware and proper configuration.

## Table of Contents

- [Security Philosophy](#security-philosophy)
- [Quick Security Checklist](#quick-security-checklist)
- [Authentication](#authentication)
- [Session Management](#session-management)
- [Authorization](#authorization)
- [CSRF Protection](#csrf-protection)
- [Content Security Policy (CSP)](#content-security-policy-csp)
- [XSS Prevention](#xss-prevention)
- [Input Validation](#input-validation)
- [Secret Management](#secret-management)
- [HTTPS/TLS Configuration](#httpstls-configuration)
- [Rate Limiting](#rate-limiting)
- [Security Headers](#security-headers)
- [Error Handling](#error-handling)
- [Security Testing](#security-testing)
- [Reporting Security Issues](#reporting-security-issues)

---

## Security Philosophy

SXO follows a **minimal core + middleware extensibility** philosophy:

✅ **What SXO Provides:**

- Path traversal protection (built-in)
- Basic security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy)
- HTML escaping utilities
- Route slug validation
- Static asset security controls
- Secure file serving with MIME type restrictions

❌ **What You Must Implement:**

- Authentication and authorization
- Session management
- CSRF protection
- Content Security Policy (CSP)
- Rate limiting
- Input validation beyond route slugs
- Application-specific security logging

This design keeps the framework lightweight while giving you full control over security policies through middleware.

---

## Quick Security Checklist

Before deploying to production, verify:

- [ ] **Secrets**: All secrets in `.env` / `.env.local`, never committed to git
- [ ] **HTTPS**: Application serves over HTTPS with valid TLS certificates
- [ ] **Authentication**: User authentication implemented via middleware
- [ ] **Sessions**: Secure session management with httpOnly, secure, sameSite cookies
- [ ] **CSRF**: CSRF token validation for state-changing operations
- [ ] **CSP**: Content-Security-Policy header configured
- [ ] **HSTS**: Strict-Transport-Security header enabled (HTTPS only)
- [ ] **Rate Limiting**: Rate limits on login, API endpoints
- [ ] **Input Validation**: All user inputs validated and sanitized
- [ ] **Dependencies**: Security audit ran (`npm audit` / `pnpm audit`)
- [ ] **Error Handling**: No stack traces or sensitive data in error responses

---

## Authentication

SXO **does not** provide built-in authentication. You must implement it via middleware.

### Recommended Patterns

#### 1. JWT (JSON Web Tokens) Authentication

**Best for:** Stateless API authentication, mobile apps, microservices

```javascript
// src/middleware.js
import { verify } from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const PUBLIC_ROUTES = ["/", "/login", "/register", "/api/health"];

export default function authMiddleware(request) {
  const url = new URL(request.url);

  // Allow public routes
  if (PUBLIC_ROUTES.includes(url.pathname)) {
    return; // Continue to route handler
  }

  // Extract token from Authorization header
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response("Unauthorized", {
      status: 401,
      headers: { "WWW-Authenticate": "Bearer" },
    });
  }

  const token = authHeader.substring(7);

  try {
    // Verify and decode JWT
    const payload = verify(token, JWT_SECRET, {
      algorithms: ["HS256"],
      maxAge: "1h", // Token expires in 1 hour
    });

    // Attach user info to request for downstream handlers
    // (requires framework support or custom context storage)
    request.user = payload;
  } catch (error) {
    return new Response("Invalid or expired token", {
      status: 401,
      headers: { "WWW-Authenticate": "Bearer" },
    });
  }
}
```

**Security Notes:**

- ⚠️ **Secret Management**: Store `JWT_SECRET` in environment variables, never hardcode
- ⚠️ **Algorithm Restriction**: Always specify `algorithms: ["HS256"]` to prevent algorithm confusion attacks
- ⚠️ **Token Expiration**: Set reasonable expiration times (`maxAge`)
- ⚠️ **HTTPS Only**: JWT tokens must be transmitted over HTTPS

**Recommended Libraries:**

- `jsonwebtoken` (Node.js): https://www.npmjs.com/package/jsonwebtoken
- `jose` (Modern, Web Standard): https://www.npmjs.com/package/jose

#### 2. Session-Based Authentication

**Best for:** Traditional web applications, server-rendered pages

```javascript
// src/middleware.js
import { createClient } from "redis"; // or any session store
import crypto from "node:crypto";

const SESSION_COOKIE_NAME = "sid";
const SESSION_DURATION_MS = 3600000; // 1 hour
const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

export default async function sessionMiddleware(request) {
  const url = new URL(request.url);
  const cookies = parseCookies(request.headers.get("Cookie"));
  const sessionId = cookies[SESSION_COOKIE_NAME];

  // Public routes
  if (["/", "/login", "/register"].includes(url.pathname)) {
    return;
  }

  if (!sessionId) {
    return redirectToLogin(url.pathname);
  }

  // Validate session
  const sessionData = await redis.get(`session:${sessionId}`);
  if (!sessionData) {
    return redirectToLogin(url.pathname);
  }

  const session = JSON.parse(sessionData);

  // Check expiration
  if (Date.now() > session.expiresAt) {
    await redis.del(`session:${sessionId}`);
    return redirectToLogin(url.pathname);
  }

  // Extend session lifetime (sliding expiration)
  session.expiresAt = Date.now() + SESSION_DURATION_MS;
  await redis.setEx(`session:${sessionId}`, SESSION_DURATION_MS / 1000, JSON.stringify(session));

  request.session = session;
}

function parseCookies(cookieHeader) {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [key, ...v] = c.trim().split("=");
      return [key, v.join("=")];
    }),
  );
}

function redirectToLogin(returnUrl) {
  const loginUrl = `/login?return=${encodeURIComponent(returnUrl)}`;
  return new Response(null, {
    status: 302,
    headers: { Location: loginUrl },
  });
}
```

**Security Notes:**

- ⚠️ **Secure Session IDs**: Use cryptographically random session IDs (min 128 bits)
- ⚠️ **HttpOnly Cookies**: Prevent XSS access to session cookies
- ⚠️ **Secure Flag**: Only transmit cookies over HTTPS
- ⚠️ **SameSite**: Set `SameSite=Strict` or `SameSite=Lax` to prevent CSRF
- ⚠️ **Session Timeout**: Implement absolute and idle timeouts
- ⚠️ **Session Storage**: Use Redis, database, or secure session store (never client-side)

#### 3. OAuth 2.0 / OpenID Connect (OIDC)

**Best for:** Third-party authentication (Google, GitHub, Auth0)

```javascript
// src/middleware.js
import { Issuer, generators } from "openid-client";

const OIDC_CONFIG = {
  issuer: process.env.OIDC_ISSUER, // e.g., "https://accounts.google.com"
  clientId: process.env.OIDC_CLIENT_ID,
  clientSecret: process.env.OIDC_CLIENT_SECRET,
  redirectUri: process.env.OIDC_REDIRECT_URI, // e.g., "https://yourdomain.com/auth/callback"
};

let oidcClient;

async function initOIDC() {
  const issuer = await Issuer.discover(OIDC_CONFIG.issuer);
  oidcClient = new issuer.Client({
    client_id: OIDC_CONFIG.clientId,
    client_secret: OIDC_CONFIG.clientSecret,
    redirect_uris: [OIDC_CONFIG.redirectUri],
    response_types: ["code"],
  });
}

initOIDC();

export default async function oidcMiddleware(request) {
  const url = new URL(request.url);

  // Handle OAuth callback
  if (url.pathname === "/auth/callback") {
    const params = oidcClient.callbackParams(request);
    const tokenSet = await oidcClient.callback(OIDC_CONFIG.redirectUri, params, {
      code_verifier: request.session?.codeVerifier, // PKCE
    });

    const userInfo = await oidcClient.userinfo(tokenSet.access_token);

    // Create session with user info
    // (Integrate with session management from previous example)

    return new Response(null, {
      status: 302,
      headers: { Location: "/" },
    });
  }

  // Initiate OAuth flow
  if (url.pathname === "/auth/login") {
    const codeVerifier = generators.codeVerifier();
    const codeChallenge = generators.codeChallenge(codeVerifier);

    const authUrl = oidcClient.authorizationUrl({
      scope: "openid email profile",
      code_challenge: codeChallenge,
      code_challenge_method: "S256",
    });

    // Store code_verifier in session
    // (Requires session management)

    return new Response(null, {
      status: 302,
      headers: { Location: authUrl },
    });
  }
}
```

**Security Notes:**

- ⚠️ **PKCE**: Always use Proof Key for Code Exchange (PKCE) to prevent authorization code interception
- ⚠️ **State Parameter**: Validate state parameter to prevent CSRF during OAuth flow
- ⚠️ **Token Storage**: Store tokens securely (server-side session, never localStorage)
- ⚠️ **Scope Minimization**: Request only necessary OAuth scopes
- ⚠️ **Token Rotation**: Refresh tokens should be rotated on use

---

## Session Management

### Secure Session Configuration

When implementing sessions, follow these critical security requirements:

```javascript
// Example: Setting secure session cookies
function createSessionCookie(sessionId, options = {}) {
  const cookieValue = sessionId;
  const cookieOptions = {
    httpOnly: true, // ✅ Prevent JavaScript access (XSS mitigation)
    secure: true, // ✅ HTTPS-only transmission
    sameSite: "Strict", // ✅ CSRF protection (or "Lax" for usability)
    maxAge: 3600, // ✅ 1 hour expiration
    path: "/", // Scope to application root
    ...options,
  };

  const cookie = Object.entries(cookieOptions)
    .map(([key, value]) => {
      if (typeof value === "boolean") return value ? key : "";
      return `${key}=${value}`;
    })
    .filter(Boolean)
    .join("; ");

  return `${SESSION_COOKIE_NAME}=${cookieValue}; ${cookie}`;
}

// Usage in response
return new Response(content, {
  status: 200,
  headers: {
    "Set-Cookie": createSessionCookie(sessionId),
  },
});
```

### Session Security Checklist

- [ ] **Random Session IDs**: Use `crypto.randomBytes(32)` or equivalent (min 128 bits)
- [ ] **HttpOnly Flag**: Prevent XSS from stealing sessions
- [ ] **Secure Flag**: Only send over HTTPS
- [ ] **SameSite Attribute**: `Strict` (best) or `Lax` (if cross-site navigation needed)
- [ ] **Absolute Timeout**: Max session lifetime (e.g., 8 hours)
- [ ] **Idle Timeout**: Expire after inactivity (e.g., 30 minutes)
- [ ] **Session Regeneration**: Generate new session ID after login/privilege escalation
- [ ] **Logout**: Properly destroy session on server and clear cookie
- [ ] **Concurrent Sessions**: Consider limiting concurrent sessions per user

### Session Storage

**✅ Recommended:**

- Redis (fast, ephemeral)
- PostgreSQL / MySQL (persistent, queryable)
- DynamoDB / Firestore (serverless-friendly)

**❌ Avoid:**

- Client-side storage (localStorage, sessionStorage) - vulnerable to XSS
- Signed cookies alone - subject to replay attacks without server-side validation

---

## Authorization

Authorization determines **what authenticated users can access**. Implement using middleware.

### Role-Based Access Control (RBAC)

```javascript
// src/middleware.js
const ROLE_PERMISSIONS = {
  admin: ["read", "write", "delete", "manage_users"],
  editor: ["read", "write"],
  viewer: ["read"],
};

function hasPermission(role, requiredPermission) {
  return ROLE_PERMISSIONS[role]?.includes(requiredPermission) ?? false;
}

export function requirePermission(permission) {
  return function authorizationMiddleware(request) {
    const user = request.user; // Set by authentication middleware

    if (!user) {
      return new Response("Unauthorized", { status: 401 });
    }

    if (!hasPermission(user.role, permission)) {
      return new Response("Forbidden: Insufficient permissions", { status: 403 });
    }

    // Authorization passed, continue
  };
}

// Usage: Compose middleware per route
export default [
  authMiddleware,
  requirePermission("write"), // Apply to all routes needing "write" permission
];
```

### Resource-Level Authorization

```javascript
// Example: User can only access their own resources
export function requireOwnership(request) {
  const url = new URL(request.url);
  const resourceOwnerId = url.searchParams.get("userId");
  const currentUser = request.user;

  if (currentUser.id !== resourceOwnerId && currentUser.role !== "admin") {
    return new Response("Forbidden: You can only access your own resources", {
      status: 403,
    });
  }
}
```

### Authorization Best Practices

- ✅ **Deny by Default**: Require explicit permission grants
- ✅ **Principle of Least Privilege**: Grant minimum necessary permissions
- ✅ **Centralized Authorization Logic**: Don't scatter authorization checks
- ✅ **Test Authorization**: Verify users can't access unauthorized resources
- ❌ **Don't Trust Client**: Never rely on client-side authorization checks

---

## CSRF Protection

Cross-Site Request Forgery (CSRF) attacks trick authenticated users into performing unwanted actions.

### Double-Submit Cookie Pattern

```javascript
// src/middleware.js
import crypto from "node:crypto";

const CSRF_COOKIE_NAME = "csrf_token";
const CSRF_HEADER_NAME = "x-csrf-token";
const STATE_CHANGING_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

function generateCSRFToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function csrfProtection(request) {
  const method = request.method;

  // Skip CSRF for safe methods (GET, HEAD, OPTIONS)
  if (!STATE_CHANGING_METHODS.includes(method)) {
    return;
  }

  // Extract CSRF token from cookie and header
  const cookies = parseCookies(request.headers.get("Cookie"));
  const cookieToken = cookies[CSRF_COOKIE_NAME];
  const headerToken = request.headers.get(CSRF_HEADER_NAME) || request.headers.get("X-XSRF-Token"); // Alternative header

  // Validate token presence
  if (!cookieToken || !headerToken) {
    return new Response("CSRF token missing", { status: 403 });
  }

  // Validate token match (constant-time comparison)
  if (!crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))) {
    return new Response("CSRF token mismatch", { status: 403 });
  }

  // CSRF validation passed
}

// Helper: Set CSRF cookie on first request
export function setCSRFCookie(request) {
  const cookies = parseCookies(request.headers.get("Cookie"));

  if (!cookies[CSRF_COOKIE_NAME]) {
    const token = generateCSRFToken();
    return {
      token,
      cookie: `${CSRF_COOKIE_NAME}=${token}; Path=/; SameSite=Strict; Secure; HttpOnly`,
    };
  }

  return { token: cookies[CSRF_COOKIE_NAME] };
}
```

### Client-Side Usage

```html
<!-- Include CSRF token in forms -->
<form method="POST" action="/api/submit">
  <input type="hidden" name="csrf_token" value="<%= csrfToken %>" />
  <!-- form fields -->
  <button type="submit">Submit</button>
</form>

<script>
  // Or include in AJAX requests
  fetch("/api/endpoint", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": document.cookie.match(/csrf_token=([^;]+)/)[1],
    },
    body: JSON.stringify(data),
  });
</script>
```

### SameSite Cookie Alternative

**Simpler approach for modern browsers:**

```javascript
// Set SameSite=Strict on session cookies
"Set-Cookie": `session_id=${sessionId}; HttpOnly; Secure; SameSite=Strict; MaxAge=3600`
```

`SameSite=Strict` prevents the browser from sending cookies on cross-origin requests, effectively mitigating CSRF without requiring CSRF tokens.

**Trade-offs:**

- ✅ **Pros**: Simpler implementation, no token management
- ❌ **Cons**: Breaks legitimate cross-site navigation (e.g., external links to your authenticated pages)

**Recommendation**: Use `SameSite=Lax` for usability + CSRF tokens for state-changing operations.

---

## Content Security Policy (CSP)

CSP is **the most effective defense against XSS attacks**. It restricts resource loading to trusted sources.

### Basic CSP Configuration

```javascript
// src/middleware.js
export function addCSP(request) {
  // Development CSP (permissive for hot reload)
  const isDev = process.env.DEV === "true";

  const cspDirectives = isDev
    ? {
        "default-src": ["'self'"],
        "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Allow eval for hot reload
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", "data:", "https:"],
        "connect-src": ["'self'", "ws:", "wss:"], // Allow WebSocket for hot reload
      }
    : {
        // Production CSP (strict)
        "default-src": ["'none'"], // Deny all by default
        "script-src": ["'self'"],
        "style-src": ["'self'"],
        "img-src": ["'self'", "data:", "https://trusted-cdn.com"],
        "font-src": ["'self'"],
        "connect-src": ["'self'"],
        "frame-ancestors": ["'none'"], // Prevent clickjacking
        "base-uri": ["'self'"], // Prevent base tag injection
        "form-action": ["'self'"], // Prevent form hijacking
        "upgrade-insecure-requests": [], // Upgrade HTTP to HTTPS
      };

  const csp = Object.entries(cspDirectives)
    .map(([directive, sources]) => `${directive} ${sources.join(" ")}`)
    .join("; ");

  // Attach to response (requires framework support or wrapper)
  return {
    "Content-Security-Policy": csp,
  };
}
```

### Nonce-Based CSP (Recommended for Inline Scripts)

```javascript
// src/middleware.js
import crypto from "node:crypto";

export function generateCSPNonce() {
  return crypto.randomBytes(16).toString("base64");
}

export function nonceBasedCSP(request) {
  const nonce = generateCSPNonce();

  // Store nonce for use in page rendering
  request.cspNonce = nonce;

  return {
    "Content-Security-Policy": `
      default-src 'self';
      script-src 'self' 'nonce-${nonce}';
      style-src 'self' 'nonce-${nonce}';
      img-src 'self' data: https:;
      object-src 'none';
      base-uri 'self';
      frame-ancestors 'none';
      upgrade-insecure-requests;
    `
      .replace(/\s+/g, " ")
      .trim(),
  };
}

// In your JSX pages:
export default function Page({ nonce }) {
  return `
    <html>
      <head>
        <script nonce="${nonce}">
          // Inline script allowed with nonce
          log.log("Trusted script");
        </script>
      </head>
      <body>...</body>
    </html>
  `;
}
```

### CSP Reporting

Monitor CSP violations in production:

```javascript
const cspWithReporting = {
  // ... other directives
  "report-uri": ["/api/csp-report"],
  "report-to": ["csp-endpoint"],
};

// Handle CSP reports
export function cspReportHandler(request) {
  const url = new URL(request.url);

  if (url.pathname === "/api/csp-report" && request.method === "POST") {
    const report = await request.json();

    // Log CSP violations
    log.error("CSP Violation:", JSON.stringify(report, null, 2));

    // Send to monitoring service (e.g., Sentry)
    // await sendToMonitoring(report);

    return new Response(null, { status: 204 });
  }
}
```

### CSP Best Practices

- ✅ **Start Strict**: Begin with `default-src 'none'` and allow only necessary sources
- ✅ **Avoid 'unsafe-inline'**: Use nonces or hashes for inline scripts/styles
- ✅ **Avoid 'unsafe-eval'**: Refactor code to eliminate `eval()`, `Function()`, etc.
- ✅ **Report-Only Mode**: Test CSP with `Content-Security-Policy-Report-Only` before enforcing
- ✅ **Monitor Violations**: Set up CSP reporting to catch issues
- ❌ **Don't Use Wildcards**: Avoid `*` sources (defeats the purpose)

---

## XSS Prevention

Cross-Site Scripting (XSS) is **the most common web vulnerability**. SXO provides defenses, but you must use them correctly.

### Built-in Protections

SXO's JSX transformer emits **template literals**, which reduces XSS risk compared to string concatenation, but **does not automatically escape HTML**.

### Use `escapeHtml()` for Untrusted Content

```javascript
import { escapeHtml } from "@utils/html-utils.js";

export default function Page({ user }) {
  const userInput = user.bio; // User-controlled content

  return `
    <html>
      <body>
        <!-- ❌ UNSAFE: Direct interpolation -->
        <p>${userInput}</p>
        
        <!-- ✅ SAFE: Escaped content -->
        <p>${escapeHtml(userInput)}</p>
      </body>
    </html>
  `;
}
```

### Context-Specific Encoding

Different contexts require different encoding:

```javascript
// HTML context
const safeHtml = escapeHtml(userInput);

// JavaScript context (inside <script> tags)
function escapeJS(str) {
  return JSON.stringify(str).slice(1, -1); // Remove quotes
}

// URL context
const safeUrl = encodeURIComponent(userInput);

// CSS context (avoid if possible)
function escapeCSS(str) {
  return str.replace(/[^a-zA-Z0-9]/g, (char) => `\\${char.charCodeAt(0).toString(16)} `);
}
```

### XSS Prevention Checklist

- [ ] **Escape Untrusted Data**: Use `escapeHtml()` for user-controlled content
- [ ] **Validate Input**: Allowlist expected formats (emails, URLs, etc.)
- [ ] **CSP Header**: Implement Content-Security-Policy (see above)
- [ ] **HttpOnly Cookies**: Prevent JavaScript access to session cookies
- [ ] **Avoid `innerHTML`**: Use safe DOM manipulation or sanitization libraries
- [ ] **Sanitize Rich Text**: Use DOMPurify or similar for user-generated HTML

---

## Input Validation

Validate **all inputs** at system boundaries (HTTP requests, database queries, file operations).

### SXO Built-in Validation

```javascript
// src/js/server/utils/route-match.js
const SLUG_REGEX = /^[A-Za-z0-9._-]{1,200}$/;

// Dynamic route slugs are automatically validated
// /blog/[slug] -> only allows alphanumeric, dots, hyphens, underscores (max 200 chars)
```

### Custom Input Validation Middleware

```javascript
// src/middleware.js
import { z } from "zod"; // Recommended: Zod for schema validation

const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(128),
});

export function validateLogin(request) {
  const url = new URL(request.url);

  if (url.pathname !== "/api/login" || request.method !== "POST") {
    return;
  }

  const body = await request.json();

  try {
    const validated = loginSchema.parse(body);
    request.validated = validated; // Attach validated data
  } catch (error) {
    return new Response(JSON.stringify({ error: "Invalid input", details: error.errors }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}
```

### Validation Best Practices

- ✅ **Allowlist > Denylist**: Define what's allowed, not what's forbidden
- ✅ **Validate Type**: Ensure data type matches expectations (string, number, etc.)
- ✅ **Validate Format**: Use regex or libraries for emails, URLs, UUIDs, etc.
- ✅ **Validate Range**: Check min/max length, numeric bounds
- ✅ **Validate Business Logic**: Ensure data makes sense (e.g., end_date > start_date)
- ✅ **Fail Securely**: Reject invalid input, don't try to "fix" it
- ❌ **Don't Trust Client Validation**: Always validate server-side

---

## Secret Management

**Never commit secrets to version control.** Use environment variables and secret management services.

### Environment Variable Setup

1. **Create `.env` and `.env.local`** (SXO loads both automatically):

```bash
# .env (committed - defaults for development)
PORT=3000
NODE_ENV=development

# .env.local (gitignored - local overrides and secrets)
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
JWT_SECRET=your-secret-key-min-32-chars-long
SESSION_SECRET=another-secret-key-for-sessions
API_KEY=external-api-key
```

2. **Add to `.gitignore`**:

```gitignore
# Environment variables
.env.local
.env.production
.env.*.local

# Secrets
secrets/
*.pem
*.key
```

3. **Validate Required Secrets at Startup**:

```javascript
// src/middleware.js or startup script
const REQUIRED_SECRETS = ["JWT_SECRET", "DATABASE_URL", "SESSION_SECRET"];

for (const secret of REQUIRED_SECRETS) {
  if (!process.env[secret]) {
    log.error(`FATAL: Missing required secret: ${secret}`);
    process.exit(1);
  }

  // Validate secret strength
  if (process.env[secret].length < 32) {
    log.error(`FATAL: Secret ${secret} must be at least 32 characters`);
    process.exit(1);
  }
}
```

### Secret Rotation

Implement periodic secret rotation:

```javascript
// Example: JWT secret rotation
const JWT_SECRETS = [
  process.env.JWT_SECRET, // Current secret
  process.env.JWT_SECRET_PREVIOUS, // Previous secret (for grace period)
];

function verifyToken(token) {
  for (const secret of JWT_SECRETS) {
    try {
      return verify(token, secret);
    } catch (error) {
      continue; // Try next secret
    }
  }
  throw new Error("Invalid token");
}
```

### Platform-Specific Secret Management

#### Cloudflare Workers

```toml
# wrangler.toml (DO NOT commit secrets here)
[env.production]
# Use wrangler secret:put instead:
# wrangler secret put JWT_SECRET
```

```bash
# Set secrets via Wrangler CLI
wrangler secret put JWT_SECRET
wrangler secret put DATABASE_URL
```

#### Node.js / Bun / Deno

Use `.env.local` (gitignored) or system environment variables:

```bash
# Production deployment
export JWT_SECRET="$(openssl rand -base64 32)"
export DATABASE_URL="postgresql://..."
npm run start
```

#### Docker

```yaml
# docker-compose.yml
services:
  app:
    environment:
      - JWT_SECRET=${JWT_SECRET}
    env_file:
      - .env.local
```

### Secret Management Services

For production, consider using dedicated secret management:

- **HashiCorp Vault**: https://www.vaultproject.io/
- **AWS Secrets Manager**: https://aws.amazon.com/secrets-manager/
- **Google Secret Manager**: https://cloud.google.com/secret-manager
- **Azure Key Vault**: https://azure.microsoft.com/en-us/products/key-vault

### Secrets Checklist

- [ ] `.env.local` is in `.gitignore`
- [ ] No secrets in source code or config files
- [ ] Secrets are minimum 32 characters (256 bits) for cryptographic keys
- [ ] Different secrets for development, staging, production
- [ ] Secrets validated at application startup
- [ ] Secret rotation plan in place
- [ ] Access to secrets is logged and audited

---

## HTTPS/TLS Configuration

**Always use HTTPS in production.** SXO does not provide built-in TLS; you must configure it at the platform level.

### Node.js with TLS

```javascript
// src/custom-server.js (if not using `sxo start`)
import https from "node:https";
import fs from "node:fs";

const tlsOptions = {
  key: fs.readFileSync(process.env.TLS_KEY_PATH || "/etc/ssl/private/server.key"),
  cert: fs.readFileSync(process.env.TLS_CERT_PATH || "/etc/ssl/certs/server.crt"),
  // Optional: intermediate CA certificates
  ca: fs.readFileSync("/etc/ssl/certs/ca-bundle.crt"),
  // Recommended: Restrict to TLS 1.2+
  minVersion: "TLSv1.2",
  // Recommended: Use strong cipher suites
  ciphers: "TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256",
};

const server = https.createServer(tlsOptions, app);
server.listen(443);
```

### Let's Encrypt (Free TLS Certificates)

```bash
# Install Certbot
sudo apt-get install certbot

# Obtain certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Certificates stored in:
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/yourdomain.com/privkey.pem

# Auto-renewal (add to cron)
sudo certbot renew
```

### Reverse Proxy (Recommended)

Use a reverse proxy to handle TLS termination:

#### Nginx

```nginx
server {
  listen 443 ssl http2;
  server_name yourdomain.com;

  ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

  # Strong TLS configuration
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers 'TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256';
  ssl_prefer_server_ciphers off;

  # HSTS (strict transport security)
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

  # Proxy to SXO app
  location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
  }
}

# Redirect HTTP to HTTPS
server {
  listen 80;
  server_name yourdomain.com;
  return 301 https://$server_name$request_uri;
}
```

#### Caddy (Automatic HTTPS)

```caddyfile
# Caddyfile
yourdomain.com {
  reverse_proxy localhost:3000
}
```

Caddy automatically obtains and renews Let's Encrypt certificates.

### Cloudflare Workers

TLS is handled automatically by Cloudflare. No configuration needed.

### Bun (Native TLS)

```javascript
Bun.serve({
  port: 443,
  tls: {
    key: Bun.file("/etc/ssl/private/server.key"),
    cert: Bun.file("/etc/ssl/certs/server.crt"),
  },
  fetch(request) {
    // Your handler
  },
});
```

### Deno (Native TLS)

```javascript
Deno.serve(
  {
    port: 443,
    cert: Deno.readTextFileSync("/etc/ssl/certs/server.crt"),
    key: Deno.readTextFileSync("/etc/ssl/private/server.key"),
  },
  handler,
);
```

### HSTS (HTTP Strict Transport Security)

Add HSTS header to force HTTPS:

```javascript
// src/middleware.js
export function addHSTS(request) {
  // Only add HSTS over HTTPS
  const url = new URL(request.url);
  if (url.protocol === "https:") {
    return {
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    };
  }
}
```

**HSTS Preload**: Submit your domain to https://hstspreload.org/ for browser-level HTTPS enforcement.

---

## Rate Limiting

Prevent abuse and brute-force attacks with rate limiting.

### Rate Limiting Strategies

#### 1. Fixed Window

```javascript
// src/middleware.js
const requestCounts = new Map(); // In-memory (use Redis for production)

export function rateLimitFixedWindow(request) {
  const clientIp = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "unknown";

  const windowMs = 60000; // 1 minute
  const maxRequests = 100;

  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const key = `${clientIp}:${windowStart}`;

  const count = requestCounts.get(key) || 0;

  if (count >= maxRequests) {
    return new Response("Too many requests", {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil((windowStart + windowMs - now) / 1000)),
      },
    });
  }

  requestCounts.set(key, count + 1);

  // Cleanup old entries
  setTimeout(() => requestCounts.delete(key), windowMs);
}
```

#### 2. Sliding Window (More Accurate)

```javascript
// Requires Redis for distributed state
import { createClient } from "redis";

const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

export async function rateLimitSlidingWindow(request) {
  const clientIp = request.headers.get("CF-Connecting-IP") || "unknown";
  const key = `rate_limit:${clientIp}`;
  const windowMs = 60000; // 1 minute
  const maxRequests = 100;
  const now = Date.now();

  // Remove old entries outside the window
  await redis.zRemRangeByScore(key, 0, now - windowMs);

  // Count requests in current window
  const count = await redis.zCard(key);

  if (count >= maxRequests) {
    const oldestTimestamp = await redis.zRange(key, 0, 0, { REV: false });
    const retryAfter = Math.ceil((parseInt(oldestTimestamp[0]) + windowMs - now) / 1000);

    return new Response("Too many requests", {
      status: 429,
      headers: { "Retry-After": String(retryAfter) },
    });
  }

  // Add current request
  await redis.zAdd(key, { score: now, value: `${now}:${Math.random()}` });
  await redis.expire(key, Math.ceil(windowMs / 1000));
}
```

### Cloudflare Workers Rate Limiting

```javascript
// Cloudflare provides built-in rate limiting via Durable Objects
import { createHandler } from "sxo/cloudflare";

class RateLimiter {
  constructor(state, env) {
    this.state = state;
  }

  async fetch(request) {
    const key = "count";
    const count = (await this.state.storage.get(key)) || 0;

    if (count > 100) {
      return new Response("Rate limit exceeded", { status: 429 });
    }

    await this.state.storage.put(key, count + 1);
    await this.state.storage.setAlarm(Date.now() + 60000); // Reset after 1 minute

    return new Response("OK");
  }

  async alarm() {
    await this.state.storage.deleteAll(); // Reset counter
  }
}
```

### Rate Limiting Best Practices

- ✅ **Protect Authentication**: Strict rate limits on `/login`, `/register`, password reset
- ✅ **API Endpoints**: Rate limit API endpoints (e.g., 1000 requests/hour/user)
- ✅ **Use Redis**: Store rate limit state in Redis for distributed systems
- ✅ **Vary Limits by User**: Authenticated users can have higher limits
- ✅ **Return 429 Status**: Use correct HTTP status code
- ✅ **Include Retry-After**: Tell clients when they can retry
- ✅ **Log Violations**: Monitor for brute-force attempts

---

## Security Headers

SXO automatically adds basic security headers (see [Security Philosophy](#security-philosophy)). You can add more via middleware.

### Recommended Security Headers

```javascript
// src/middleware.js
export function securityHeaders(request) {
  return {
    // SXO built-in headers (automatically included):
    // "X-Content-Type-Options": "nosniff",
    // "X-Frame-Options": "DENY",
    // "Referrer-Policy": "strict-origin-when-cross-origin",

    // Additional recommended headers:
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload", // HTTPS only!
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    "X-XSS-Protection": "0", // Disable legacy XSS filter (CSP is better)
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Embedder-Policy": "require-corp",
    "Cross-Origin-Resource-Policy": "same-origin",
  };
}
```

### Header Descriptions

| Header                         | Purpose                                 | Recommended Value                               |
| ------------------------------ | --------------------------------------- | ----------------------------------------------- |
| `X-Content-Type-Options`       | Prevent MIME sniffing                   | `nosniff` (built-in)                            |
| `X-Frame-Options`              | Prevent clickjacking                    | `DENY` or `SAMEORIGIN` (built-in)               |
| `Referrer-Policy`              | Control referrer information            | `strict-origin-when-cross-origin` (built-in)    |
| `Strict-Transport-Security`    | Force HTTPS                             | `max-age=31536000; includeSubDomains; preload`  |
| `Content-Security-Policy`      | XSS protection                          | See [CSP section](#content-security-policy-csp) |
| `Permissions-Policy`           | Restrict browser features               | `geolocation=(), camera=(), microphone=()`      |
| `Cross-Origin-Opener-Policy`   | Isolate browsing context                | `same-origin`                                   |
| `Cross-Origin-Embedder-Policy` | Require CORP for cross-origin resources | `require-corp`                                  |
| `Cross-Origin-Resource-Policy` | Prevent cross-origin resource loading   | `same-origin`                                   |

### Test Your Headers

Use online security scanners:

- **Mozilla Observatory**: https://observatory.mozilla.org/
- **Security Headers**: https://securityheaders.com/

---

## Error Handling

Proper error handling prevents information disclosure and improves user experience.

### Generic Error Messages

**❌ Don't:**

```javascript
return new Response(`Database error: ${error.message}`, { status: 500 });
// Reveals: "Database error: relation 'users' does not exist"
```

**✅ Do:**

```javascript
log.error("Database error:", error); // Log detailed error server-side
return new Response("An error occurred. Please try again later.", { status: 500 });
```

### Structured Error Handling

```javascript
// src/middleware.js
export function errorHandler(request) {
  try {
    // Your request handling logic
  } catch (error) {
    // Log full error details server-side
    log.error({
      message: error.message,
      stack: error.stack,
      url: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
    });

    // Return generic error to client
    const isDev = process.env.DEV === "true";
    const errorResponse = isDev
      ? { error: error.message, stack: error.stack } // Dev: include stack trace
      : { error: "Internal server error" }; // Prod: generic message

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
```

### Error Logging

Integrate with logging/monitoring services:

```javascript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

export function logError(error, context) {
  Sentry.captureException(error, {
    extra: context,
  });
}
```

### Error Handling Best Practices

- ✅ **Log Detailed Errors Server-Side**: Include stack traces, request context
- ✅ **Return Generic Messages to Users**: Avoid exposing sensitive information
- ✅ **Use Structured Logging**: JSON logs for easier parsing
- ✅ **Monitor Errors**: Integrate with Sentry, Datadog, CloudWatch, etc.
- ✅ **Set Appropriate Status Codes**: 400 (bad request), 401 (unauthorized), 403 (forbidden), 404 (not found), 500 (server error)
- ❌ **Never Expose Stack Traces in Production**: Security risk + bad UX

---

## Security Testing

### Automated Security Scanning

```bash
# 1. Dependency audit
npm audit
pnpm audit

# 2. Fix vulnerabilities
npm audit fix
pnpm audit --fix

# 3. Static analysis (optional)
npm install -g eslint-plugin-security
eslint --plugin security .
```

### Manual Security Testing Checklist

- [ ] **Path Traversal**: Try `GET /../../../etc/passwd`, `GET /..%2F..%2F..%2Fetc%2Fpasswd`
- [ ] **XSS**: Inject `<script>alert('XSS')</script>` in all input fields
- [ ] **SQL Injection**: Test with `' OR '1'='1`, `'; DROP TABLE users; --`
- [ ] **CSRF**: Submit form from external site, check if blocked
- [ ] **Authentication Bypass**: Try accessing `/admin` without login
- [ ] **Session Fixation**: Set session ID before login, check if regenerated
- [ ] **Brute Force**: Try 100+ failed logins, verify rate limiting
- [ ] **File Upload**: Upload `.php`, `.exe`, malicious images
- [ ] **CORS**: Check if `Access-Control-Allow-Origin: *` is present
- [ ] **Error Messages**: Verify no stack traces or sensitive data in errors

### Penetration Testing Tools

- **OWASP ZAP**: https://www.zaproxy.org/ (automated vulnerability scanner)
- **Burp Suite**: https://portswigger.net/burp (manual testing proxy)
- **Nikto**: https://github.com/sullo/nikto (web server scanner)

### Security Testing in CI/CD

```yaml
# .github/workflows/security.yml
name: Security Scan

on: [push, pull_request]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install
      - run: npm audit --audit-level=moderate
      - run: npx snyk test # Requires SNYK_TOKEN
```

---

## Reporting Security Issues

**Please report security vulnerabilities responsibly.**

### How to Report

1. **Do NOT open a public GitHub issue** for security vulnerabilities.
2. Email security reports to: **[YOUR_EMAIL]** (or create GitHub Security Advisory)
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Depends on severity (critical: 7 days; high: 30 days; medium: 90 days)

### Security Advisory Policy

We follow **coordinated disclosure**:

1. Researcher reports vulnerability privately
2. We confirm and develop a fix
3. Fix is released in a security patch
4. Public disclosure after users have time to update (typically 30 days)

### Bug Bounty

_(Optional: Add bug bounty program details if applicable)_

---

## Additional Resources

### OWASP Resources

- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **OWASP ASVS**: https://owasp.org/www-project-application-security-verification-standard/
- **OWASP Cheat Sheets**: https://cheatsheetseries.owasp.org/

### Security Standards

- **PCI DSS**: Payment Card Industry Data Security Standard
- **GDPR**: General Data Protection Regulation (EU)
- **HIPAA**: Health Insurance Portability and Accountability Act (US healthcare)
- **SOC 2**: Service Organization Control 2 (trust principles)
