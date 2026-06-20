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
            const raw = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);

            // Tee first to preserve terminal behavior
            if (tee) {
                if (prefix) {
                    const text = raw.toString("utf8");
                    const parts = text.split(/\r?\n/);
                    for (let i = 0; i < parts.length; i++) {
                        const part = parts[i];
                        if (i < parts.length - 1 || part.length > 0) {
                            const out = `${prefix}${part}`;
                            tee.write(`${out}\n`);
                        }
                    }
                } else {
                    tee.write(raw);
                }
            }

            // Accumulate and emit complete lines to callback
            buffer += raw.toString("utf8");
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() ?? "";
            if (onLine) {
                for (const line of lines) {
                    try {
                        onLine(prefix ? prefix + line : line, raw);
                    } catch {
                        // ignore callback errors
                    }
                }
            }
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
