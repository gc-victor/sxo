function teeChunk(raw, tee, prefix) {
    if (!tee) return;
    if (!prefix) {
        tee.write(raw);
        return;
    }

    const parts = raw.toString("utf8").split(/\r?\n/);
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (i < parts.length - 1 || part.length > 0) {
            tee.write(`${prefix}${part}\n`);
        }
    }
}

function emitCompleteLines(raw, buffer, onLine, prefix) {
    const lines = buffer.split(/\r?\n/);
    const remainder = lines.pop() ?? "";
    if (onLine) {
        for (const line of lines) {
            try {
                onLine(prefix ? prefix + line : line, raw);
            } catch {
                // ignore callback errors
            }
        }
    }
    return remainder;
}

function processChunk(chunk, buffer, onLine, tee, prefix) {
    const raw = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    teeChunk(raw, tee, prefix);
    return emitCompleteLines(raw, buffer + raw.toString("utf8"), onLine, prefix);
}

/**
 * Wire a readable stream with line-buffered callbacks and optional tee.
 *
 * Handles line buffering, emits complete lines to onLine callback,
 * and optionally tees raw chunks to a writable stream.
 *
 * @param {import('node:stream').Readable} readable - Stream to wire
 * @param {(line: string, chunk: Buffer) => void} [onLine] - Line callback
 * @param {import('node:stream').Writable|null} tee - Optional tee stream (e.g., process.stdout)
 * @param {string} prefix - Prefix to add to each line
 */
export function wireOutput(readable, onLine, tee = null, prefix = "") {
    let buffer = "";
    readable.on("data", (chunk) => {
        try {
            buffer = processChunk(chunk, buffer, onLine, tee, prefix);
        } catch {
            // ignore stream errors
        }
    });

    /**
     * Flush any remaining buffer content on stream close/end.
     */
    const flush = () => {
        if (buffer.length > 0 && onLine) {
            try {
                onLine(prefix ? prefix + buffer : buffer, Buffer.from(buffer));
            } catch {
                // ignore callback errors
            }
        }
    };

    readable.on("close", flush);
    readable.on("end", flush);
}
