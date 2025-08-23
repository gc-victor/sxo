import { ok, strictEqual } from "node:assert";
import fsp from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { test } from "node:test";
import { OUTPUT_DIR_CLIENT, OUTPUT_DIR_SERVER } from "../../../constants.js";
import { statics } from "../statics.js";

async function writeFileEnsured(filePath, content) {
    await fsp.mkdir(path.dirname(filePath), { recursive: true });
    await fsp.writeFile(filePath, content, "utf8");
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
