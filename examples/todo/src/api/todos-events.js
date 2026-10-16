import { json } from "./json.js";

const clients = new Set();
const encoder = new TextEncoder();
const updateEvent = encoder.encode("event: todos-update\ndata: update\n\n");

export function publishTodosUpdate() {
    for (const client of clients) {
        try {
            client.send(updateEvent);
        } catch {
            client.close();
        }
    }
}

/** Handle SSE subscriptions for todo updates. */
export function todosEventsApi(request) {
    const url = new URL(request.url);
    if (url.pathname !== "/api/todos/events") return;
    if (request.method !== "GET") return json({ error: "method not allowed" }, 405);

    let controller;
    let subscribed = false;
    const unsubscribe = () => {
        if (!subscribed) return;
        subscribed = false;
        clients.delete(client);
        request.signal.removeEventListener("abort", close);
    };
    const client = {
        send(payload) {
            controller.enqueue(payload);
        },
        close() {
            unsubscribe();
            try {
                controller?.close();
            } catch {
                // The stream may already be cancelled by the client.
            }
        },
    };
    const close = () => client.close();

    const stream = new ReadableStream({
        start(streamController) {
            controller = streamController;
            if (request.signal.aborted) {
                client.close();
                return;
            }
            subscribed = true;
            clients.add(client);
            request.signal.addEventListener("abort", close, { once: true });
            controller.enqueue(encoder.encode(": connected\n\n"));
        },
        cancel() {
            unsubscribe();
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        },
    });
}
