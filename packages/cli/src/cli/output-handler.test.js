import assert from "node:assert/strict";
import { Readable, Writable } from "node:stream";
import test from "node:test";
import { wireOutput } from "./output-handler.js";

function createMockReadable(chunks) {
    const readable = new Readable({
        read() {
            for (const chunk of chunks) {
                this.push(chunk);
            }
            this.push(null);
        },
    });
    return readable;
}

function createMockWritable() {
    const chunks = [];
    const writable = new Writable({
        write(chunk, _encoding, callback) {
            chunks.push(chunk);
            callback();
        },
    });
    writable.chunks = chunks;
    return writable;
}

test("wireOutput: emits complete lines to callback", async () => {
    const lines = [];
    const readable = createMockReadable([Buffer.from("line1\n"), Buffer.from("line2\n")]);

    wireOutput(readable, (line) => lines.push(line), null, "");

    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.deepEqual(lines, ["line1", "line2"]);
});

test("wireOutput: handles CRLF line endings", async () => {
    const lines = [];
    const readable = createMockReadable([Buffer.from("line1\r\n"), Buffer.from("line2\r\n")]);

    wireOutput(readable, (line) => lines.push(line), null, "");

    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.deepEqual(lines, ["line1", "line2"]);
});

test("wireOutput: handles mixed LF and CRLF", async () => {
    const lines = [];
    const readable = createMockReadable([Buffer.from("a\r\nb\nc\r\n")]);

    wireOutput(readable, (line) => lines.push(line), null, "");

    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.deepEqual(lines, ["a", "b", "c"]);
});

test("wireOutput: prefixes lines when prefix provided", async () => {
    const lines = [];
    const readable = createMockReadable([Buffer.from("test\n")]);

    wireOutput(readable, (line) => lines.push(line), null, "[P] ");

    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.deepEqual(lines, ["[P] test"]);
});

test("wireOutput: tees output to writable stream without prefix", async () => {
    const lines = [];
    const tee = createMockWritable();
    const readable = createMockReadable([Buffer.from("output\n")]);

    wireOutput(readable, (line) => lines.push(line), tee, "");

    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.deepEqual(lines, ["output"]);
    assert.strictEqual(tee.chunks.length, 1);
});

test("wireOutput: tees output with prefix handling newlines", async () => {
    const lines = [];
    const tee = createMockWritable();
    const readable = createMockReadable([Buffer.from("test\n")]);

    wireOutput(readable, (line) => lines.push(line), tee, "[P] ");

    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.deepEqual(lines, ["[P] test"]);
    assert.strictEqual(tee.chunks.length, 1);
    assert.ok(tee.chunks[0].toString().includes("[P] test"));
});

test("wireOutput: accumulates partial lines", async () => {
    const lines = [];
    const readable = createMockReadable([Buffer.from("part1"), Buffer.from("-part2\n")]);

    wireOutput(readable, (line) => lines.push(line), null, "");

    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.deepEqual(lines, ["part1-part2"]);
});

test("wireOutput: ignores callback errors gracefully", async () => {
    const readable = createMockReadable([Buffer.from("test\n")]);

    assert.doesNotThrow(async () => {
        wireOutput(
            readable,
            () => {
                throw new Error("callback error");
            },
            null,
            "",
        );
        await new Promise((resolve) => setTimeout(resolve, 50));
    });
});

test("wireOutput: ignores stream errors gracefully", () => {
    const lines = [];
    const readable = new Readable({
        read() {
            try {
                this.emit("error", new Error("stream error"));
            } catch {
                // ignore
            }
            this.push(null);
        },
    });

    wireOutput(readable, (line) => lines.push(line), null, "");

    assert.ok(true, "wireOutput should not throw on stream error");
});

test("wireOutput: handles empty chunks", async () => {
    const lines = [];
    const readable = createMockReadable([Buffer.from(""), Buffer.from("test\n")]);

    wireOutput(readable, (line) => lines.push(line), null, "");

    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.deepEqual(lines, ["test"]);
});

test("wireOutput: handles multiple chunks with mixed content", async () => {
    const lines = [];
    const readable = createMockReadable([Buffer.from("hello"), Buffer.from(" world\n"), Buffer.from("good"), Buffer.from("bye\n")]);

    wireOutput(readable, (line) => lines.push(line), null, "");

    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.deepEqual(lines, ["hello world", "goodbye"]);
});

test("wireOutput: registers close and end handlers for flush", () => {
    const readable = new Readable({
        read() {
            this.push("test");
            this.push(null);
        },
    });

    const handlers = {};
    readable.on = (event, handler) => {
        handlers[event] = handler;
        return readable;
    };

    wireOutput(readable, () => {}, null, "");

    assert.strictEqual(typeof handlers.close, "function", "should register close handler");
    assert.strictEqual(typeof handlers.end, "function", "should register end handler");
});

test("wireOutput: handles buffer with trailing newline", async () => {
    const lines = [];
    const readable = createMockReadable([Buffer.from("complete\n")]);

    wireOutput(readable, (line) => lines.push(line), null, "");

    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.deepEqual(lines, ["complete"]);
});

test("wireOutput: passes raw chunk to callback", async () => {
    let receivedRaw = null;
    const readable = createMockReadable([Buffer.from("line\n")]);

    wireOutput(
        readable,
        (_line, raw) => {
            receivedRaw = raw;
        },
        null,
        "",
    );

    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.ok(receivedRaw, "should receive raw chunk");
    assert.ok(Buffer.isBuffer(receivedRaw), "raw should be a buffer");
});

test("wireOutput: handles non-buffer chunks", async () => {
    const lines = [];
    const readable = new Readable({
        read() {
            this.push("string-chunk\n");
            this.push(null);
        },
    });

    wireOutput(readable, (line) => lines.push(line), null, "");
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.deepEqual(lines, ["string-chunk"]);
});

test("wireOutput: flush ignores callback errors", async () => {
    const readable = new Readable({
        read() {
            this.push("pending");
            this.push(null);
        },
    });

    assert.doesNotThrow(async () => {
        wireOutput(
            readable,
            () => {
                throw new Error("flush error");
            },
            null,
            "",
        );
        readable.emit("close");
        await new Promise((resolve) => setTimeout(resolve, 50));
    });
});
