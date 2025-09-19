import { match, ok, strictEqual } from "node:assert";
import fsp from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { test } from "node:test";
import { brotliCompressSync, gzipSync } from "node:zlib";
import { OUTPUT_DIR_CLIENT, OUTPUT_DIR_SERVER } from "../../../constants.js";
import { statics } from "../statics.js";

/* --------------------------- helpers --------------------------- */

async function writeFileEnsured(filePath, content, { mtimeMs } = {}) {
    await fsp.mkdir(path.dirname(filePath), { recursive: true });
    await fsp.writeFile(filePath, content);
    if (mtimeMs != null) {
        const atime = new Date();
        const mtime = new Date(mtimeMs);
        await fsp.utimes(filePath, atime, mtime);
    }
}

async function writeCompressedVariants(absPath, content) {
    const br = brotliCompressSync(content);
    const gz = gzipSync(content);
    await fsp.writeFile(`${absPath}.br`, br);
    await fsp.writeFile(`${absPath}.gz`, gz);
    return { br, gz };
}

async function startServer() {
    const server = http.createServer(async (req, res) => {
        try {
            const handled = await statics(req, res);
            if (handled) return;
            res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("Not Found");
        } catch {
            res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("Internal Error");
        }
    });
    await new Promise((resolve) => server.listen(0, resolve));
    const address = server.address();
    return { server, port: address.port };
}

async function fetchPath(port, pathname) {
    const url = `http://127.0.0.1:${port}${pathname}`;
    const res = await fetch(url);
    const text = await res.text();
    return { status: res.status, body: text };
}

async function httpRequest(port, pathname, { method = "GET", headers = {} } = {}) {
    const url = `http://127.0.0.1:${port}${pathname}`;
    const res = await fetch(url, { method, headers });
    const buf = Buffer.from(await res.arrayBuffer());
    // Collect headers into a plain object (case-insensitive)
    const hdrs = {};
    res.headers.forEach((v, k) => {
        hdrs[k.toLowerCase()] = v;
    });
    return { status: res.status, headers: hdrs, body: buf };
}

/* ----------------------------- tests ----------------------------- */

test("static file serving + security (real HTTP server)", async () => {
    // Prepare fixtures
    await writeFileEnsured(path.join(OUTPUT_DIR_CLIENT, "app.js"), "console.log('client ok');");
    await writeFileEnsured(path.join(OUTPUT_DIR_SERVER, "secret.js"), "console.log('TOPSECRET');");

    const clientExists = await fsp
        .stat(path.join(OUTPUT_DIR_CLIENT, "app.js"))
        .then(() => true)
        .catch(() => false);
    const serverExists = await fsp
        .stat(path.join(OUTPUT_DIR_SERVER, "secret.js"))
        .then(() => true)
        .catch(() => false);
    ok(clientExists, "Client asset should exist");
    ok(serverExists, "Server (private) asset should exist");

    const { server, port } = await startServer();
    try {
        // 1. Client asset
        {
            const { status, body } = await fetchPath(port, "/app.js");
            strictEqual(status, 200, "Expected 200 for existing client asset");
            ok(/client ok/.test(body), "Client asset body should be returned");
        }

        // 2. Direct server asset should not be served
        {
            const { status, body } = await fetchPath(port, "/server/secret.js");
            ok(status === 403 || status === 404, `Expected 403 or 404 for server asset, got ${status}`);
            ok(!/TOPSECRET/.test(body), "Server secret content must not leak");
        }

        // 3. Traversal attempt
        {
            const { status, body } = await fetchPath(port, "/client/../server/secret.js");
            ok(status === 403 || status === 404, `Expected 403 or 404 for traversal attempt, got ${status}`);
            ok(!/TOPSECRET/.test(body), "Traversal must not expose secret");
        }

        // 4. Missing client asset
        {
            const { status, body } = await fetchPath(port, "/missing.js");
            strictEqual(status, 404, "Expected 404 for missing client asset");
            ok(!/TOPSECRET/.test(body), "Missing asset response must not leak secret");
        }
    } finally {
        await new Promise((resolve) => server.close(resolve));
    }
});

test("statics: ETag and conditional GET (If-None-Match) and If-Modified-Since", async () => {
    // Prepare file
    const rel = "etag/hello.txt";
    const abs = path.join(OUTPUT_DIR_CLIENT, rel);
    await writeFileEnsured(abs, "hello world");
    const { server, port } = await startServer();
    try {
        // Initial GET
        const r1 = await httpRequest(port, "/etag/hello.txt");
        strictEqual(r1.status, 200);
        ok(r1.headers.etag, "ETag should be present");
        ok(r1.headers["last-modified"], "Last-Modified should be present");
        ok(r1.headers.vary?.toLowerCase().includes("accept-encoding"), "Vary must include Accept-Encoding");
        match(r1.headers.etag, /^W\/"[0-9a-f]+-[0-9a-f]+"$/);

        // HEAD with If-None-Match should yield 304 (ETag match)
        const r2 = await httpRequest(port, "/etag/hello.txt", {
            method: "HEAD",
            headers: { "If-None-Match": r1.headers.etag },
        });
        strictEqual(r2.status, 304);
        strictEqual(r2.body.length, 0);
    } finally {
        await new Promise((r) => server.close(r));
    }
});

test("statics: precompressed variants negotiation prefers br over gzip and disables range on compressed", async () => {
    const rel = "compress/comp.js";
    const abs = path.join(OUTPUT_DIR_CLIENT, rel);
    const content = Buffer.from("/* some js payload */\nconst x = 1;\n");
    await writeFileEnsured(abs, content);
    await writeCompressedVariants(abs, content);

    const { server, port } = await startServer();
    try {
        // Prefer br when available
        const rBr = await httpRequest(port, "/compress/comp.js", {
            headers: { "Accept-Encoding": "br, gzip" },
        });
        strictEqual(rBr.status, 200);
        strictEqual(rBr.headers["content-encoding"], "br");
        strictEqual(rBr.headers["accept-ranges"] ?? null, null, "No Accept-Ranges on compressed");
        ok(rBr.body.length > 0, "Body should be non-empty");

        // Fall back to gzip when br not acceptable
        const rGz = await httpRequest(port, "/compress/comp.js", {
            headers: { "Accept-Encoding": "gzip" },
        });
        strictEqual(rGz.status, 200);
        strictEqual(rGz.headers["content-encoding"], "gzip");
        strictEqual(rGz.headers["accept-ranges"] ?? null, null, "No Accept-Ranges on compressed");
        ok(rGz.body.length > 0, "Body should be non-empty");

        // Identity -> original file; Accept-Ranges enabled
        const rId = await httpRequest(port, "/compress/comp.js", {
            headers: { "Accept-Encoding": "identity" },
        });
        strictEqual(rId.status, 200);
        strictEqual(rId.headers["content-encoding"] ?? null, null);
        strictEqual(rId.headers["accept-ranges"], "bytes");
        strictEqual(rId.body.equals(content), true, "Body should equal original");
    } finally {
        await new Promise((r) => server.close(r));
    }
});

test("statics: Range requests (206 partial; 416 invalid; HEAD range returns headers only)", async () => {
    const rel = "range/range.txt";
    const abs = path.join(OUTPUT_DIR_CLIENT, rel);
    const body = Buffer.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ"); // 26 bytes
    await writeFileEnsured(abs, body);

    const { server, port } = await startServer();
    try {
        // Valid range 2-5 => "CDEF"
        const r206 = await httpRequest(port, "/range/range.txt", {
            headers: { Range: "bytes=2-5" },
        });
        strictEqual(r206.status, 206);
        strictEqual(r206.headers["accept-ranges"], "bytes");
        strictEqual(r206.headers["content-range"], "bytes 2-5/26");
        strictEqual(Number(r206.headers["content-length"]), 4);
        strictEqual(r206.body.toString("utf8"), "CDEF");

        // HEAD + Range
        const rHead = await httpRequest(port, "/range/range.txt", {
            method: "HEAD",
            headers: { Range: "bytes=0-3" },
        });
        strictEqual(rHead.status, 206);
        strictEqual(rHead.headers["content-range"], "bytes 0-3/26");
        strictEqual(Number(rHead.headers["content-length"]), 4);
        strictEqual(rHead.body.length, 0, "HEAD response should not include body");

        // Invalid range: start beyond file size
        const r416 = await httpRequest(port, "/range/range.txt", {
            headers: { Range: "bytes=999-1000" },
        });
        strictEqual(r416.status, 416);
        strictEqual(r416.headers["content-range"], "bytes */26");
        strictEqual(r416.body.length, 0);
    } finally {
        await new Promise((r) => server.close(r));
    }
});

test("statics: Cache-Control long for hashed assets and shorter for non-hashed", async () => {
    // Non-hashed
    const plainRel = "cache/app.js";
    const plainAbs = path.join(OUTPUT_DIR_CLIENT, plainRel);
    await writeFileEnsured(plainAbs, "console.log('plain');\n");

    // Hashed (hex) and (base36 uppercase 8 chars)
    const hashedRelHex = "cache/app.abcdef12.js";
    const hashedAbsHex = path.join(OUTPUT_DIR_CLIENT, hashedRelHex);
    await writeFileEnsured(hashedAbsHex, "console.log('hexhash');\n");

    const hashedRelB36 = "cache/global.JF2RTEIZ.js";
    const hashedAbsB36 = path.join(OUTPUT_DIR_CLIENT, hashedRelB36);
    await writeFileEnsured(hashedAbsB36, "console.log('base36');\n");

    const { server, port } = await startServer();
    try {
        const rp = await httpRequest(port, "/cache/app.js");
        strictEqual(rp.status, 200);
        strictEqual(rp.headers["cache-control"], "public, max-age=300");

        const rh1 = await httpRequest(port, "/cache/app.abcdef12.js");
        strictEqual(rh1.status, 200);
        strictEqual(rh1.headers["cache-control"], "public, max-age=31536000, immutable");

        const rh2 = await httpRequest(port, "/cache/global.JF2RTEIZ.js");
        strictEqual(rh2.status, 200);
        strictEqual(rh2.headers["cache-control"], "public, max-age=31536000, immutable");

        // Also verify hashed + gzip still long cache and no ranges (compressed)
        await writeCompressedVariants(hashedAbsHex, Buffer.from("console.log('hexhash');\n"));
        const rh1gz = await httpRequest(port, "/cache/app.abcdef12.js", { headers: { "Accept-Encoding": "gzip" } });
        strictEqual(rh1gz.status, 200);
        strictEqual(rh1gz.headers["cache-control"], "public, max-age=31536000, immutable");
        strictEqual(rh1gz.headers["content-encoding"], "gzip");
        strictEqual(rh1gz.headers["accept-ranges"] ?? null, null, "No Accept-Ranges on compressed");
        ok(rh1gz.body.length > 0);
    } finally {
        await new Promise((r) => server.close(r));
    }
});
