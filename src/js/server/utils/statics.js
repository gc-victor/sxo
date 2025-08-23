import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { OUTPUT_DIR_CLIENT } from "../../constants.js";

const MAX_PATH_LEN = 1024;

// More accurate MIME types
const assetMimeTypes = {
    ".css": "text/css; charset=utf-8",
    ".gif": "image/gif",
    ".html": "text/html; charset=utf-8",
    ".htm": "text/html; charset=utf-8",
    ".ico": "image/x-icon",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".map": "application/json; charset=utf-8",
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".svg": "image/svg+xml; charset=utf-8",
    ".xml": "application/xml; charset=utf-8",
    ".webp": "image/webp",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
    ".eot": "application/vnd.ms-fontobject",
    ".webmanifest": "application/manifest+json; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
    ".md": "text/markdown; charset=utf-8",
    ".csv": "text/csv; charset=utf-8",
    ".bmp": "image/bmp",
    ".tiff": "image/tiff",
    ".tif": "image/tiff",
    ".avif": "image/avif",
    ".apng": "image/apng",
    ".zip": "application/zip",
    ".gz": "application/gzip",
    ".tar": "application/x-tar",
    ".7z": "application/x-7z-compressed",
    ".rar": "application/vnd.rar",
    ".mp3": "audio/mpeg",
    ".mp4": "video/mp4",
    ".wav": "audio/wav",
    ".webm": "video/webm",
    ".weba": "audio/webm",
    ".ogg": "application/ogg",
    ".oga": "audio/ogg",
    ".ogv": "video/ogg",
    ".wasm": "application/wasm",
};

const compressibleExts = new Set([
    ".html",
    ".htm",
    ".js",
    ".mjs",
    ".css",
    ".svg",
    ".json",
    ".xml",
    ".txt",
    ".md",
    ".csv",
    ".webmanifest",
    ".map",
]);

export async function statics(req, res) {
    try {
        // Parse and validate URL path
        const urlObj = new URL(req.url, "http://localhost");
        const pathname = urlObj.pathname || "/";
        if (pathname.length > MAX_PATH_LEN) return false;
        // Disallow null bytes
        if (pathname.includes("\0")) return false;

        // Only serve requests with a known extension
        const ext = path.posix.extname(pathname);
        if (!ext || !assetMimeTypes[ext]) return false;

        // Normalize and build absolute path under OUTPUT_DIR_CLIENT
        // Remove leading slash so join doesn't ignore OUTPUT_DIR_CLIENT
        const rel = path.posix.normalize(pathname.replace(/^\/+/, ""));
        // Prevent traversal
        const abs = path.resolve(OUTPUT_DIR_CLIENT, rel);
        const root = path.resolve(OUTPUT_DIR_CLIENT);
        if (!abs.startsWith(root + path.sep) && abs !== root) {
            // Outside OUTPUT_DIR_CLIENT
            res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("Forbidden");
            return true;
        }

        // Support HEAD
        const isHead = req.method === "HEAD";

        // Pick precompressed variant if available and appropriate
        appendVary(res, "Accept-Encoding");
        let sendPath = abs;
        let contentEncoding = null;

        const ae = String(req.headers["accept-encoding"] || "");
        const canBr = /\bbr\b/.test(ae);
        const canGzip = /\bgzip\b/.test(ae);
        const basename = path.basename(abs);
        const isCompressible = compressibleExts.has(ext);

        if (isCompressible) {
            if (canBr && (await fileExists(`${abs}.br`))) {
                sendPath = `${abs}.br`;
                contentEncoding = "br";
            } else if (canGzip && (await fileExists(`${abs}.gz`))) {
                sendPath = `${abs}.gz`;
                contentEncoding = "gzip";
            }
        }

        // Stat selected file
        fs.stat(sendPath, (err, stat) => {
            if (err || !stat.isFile()) {
                res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
                res.end("Not found");
                return;
            }

            // Cache headers
            const etag = weakEtag(stat);
            res.setHeader("ETag", etag);
            res.setHeader("Last-Modified", stat.mtime.toUTCString());

            const cacheControl = isHashedAsset(basename) ? "public, max-age=31536000, immutable" : "public, max-age=300";
            res.setHeader("Cache-Control", cacheControl);

            // Content headers
            res.setHeader("Content-Type", assetMimeTypes[ext]);
            if (contentEncoding) {
                res.setHeader("Content-Encoding", contentEncoding);
            }

            // Conditional GET
            const inm = req.headers["if-none-match"];
            if (
                inm &&
                String(inm)
                    .split(",")
                    .map((s) => s.trim())
                    .includes(etag)
            ) {
                res.writeHead(304);
                res.end();
                return;
            }
            const ims = req.headers["if-modified-since"];
            if (ims) {
                const since = Date.parse(ims);
                if (!Number.isNaN(since) && stat.mtime.getTime() <= since) {
                    res.writeHead(304);
                    res.end();
                    return;
                }
            }

            // Range support (only for uncompressed file; ranges over compressed bytes are not ideal)
            const canRange = !contentEncoding; // serve ranges only when not precompressed
            if (canRange) {
                res.setHeader("Accept-Ranges", "bytes");
                const range = req.headers.range;
                if (range && /^bytes=\d*-\d*(,\d*-\d*)*$/.test(range)) {
                    const [startStr, endStr] = range
                        .replace(/bytes=/, "")
                        .split(",")[0]
                        .split("-");
                    let start = startStr ? parseInt(startStr, 10) : 0;
                    let end = endStr ? parseInt(endStr, 10) : stat.size - 1;
                    if (Number.isNaN(start)) start = 0;
                    if (Number.isNaN(end)) end = stat.size - 1;
                    if (start > end || start >= stat.size) {
                        res.writeHead(416, {
                            "Content-Range": `bytes */${stat.size}`,
                        });
                        res.end();
                        return;
                    }
                    end = Math.min(end, stat.size - 1);
                    const chunkSize = end - start + 1;
                    res.writeHead(206, {
                        "Content-Range": `bytes ${start}-${end}/${stat.size}`,
                        "Content-Length": String(chunkSize),
                    });
                    if (isHead) {
                        res.end();
                        return;
                    }
                    const stream = fs.createReadStream(sendPath, { start, end });
                    stream.on("error", () => res.destroy());
                    stream.pipe(res);
                    return;
                }
            }

            // No range or compressed: send whole file
            res.setHeader("Content-Length", String(stat.size));
            if (isHead) {
                res.writeHead(200);
                res.end();
                return;
            }
            res.writeHead(200);
            const stream = fs.createReadStream(sendPath);
            stream.on("error", () => res.destroy());
            stream.pipe(res);
        });

        return true;
    } catch {
        // Malformed URL or other sync error
        res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Bad Request");
        return true;
    }
}

function isHashedAsset(basename) {
    // Accept either:
    // - hex hash segment (≥8 chars) e.g. file.abcdef1234.css / file-abcdef1234.css
    // - esbuild-style base36 uppercase 8-char hash e.g. global.JF2RTEIZ.css
    // Segment must be delimited by start/dot/hyphen and followed by dot or end.
    return /(?:^|\.|-)(?:[a-f0-9]{8,}|[A-Z0-9]{8})(?:\.|$)/.test(basename);
}

function weakEtag(stat) {
    // Weak ETag based on size and mtime
    return `W/"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
}

async function fileExists(filePath) {
    try {
        await fsp.access(filePath, fs.constants.R_OK);
        return true;
    } catch {
        return false;
    }
}

function appendVary(res, value) {
    const prev = res.getHeader("Vary");
    if (!prev) {
        res.setHeader("Vary", value);
        return;
    }
    const set = new Set(
        String(prev)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
    );
    for (const v of value.split(",")) {
        set.add(v.trim());
    }
    res.setHeader("Vary", Array.from(set).join(", "));
}
