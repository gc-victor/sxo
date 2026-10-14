import { getTodo, removeTodo, setCompleted } from "../store.js";
import { json } from "./json.js";

/** Handle item requests for /api/todos/:id. */
export async function todoApi(request) {
    const url = new URL(request.url);
    const match = url.pathname.match(/^\/api\/todos\/(\d+)$/);
    if (!match) return;

    const id = Number(match[1]);
    if (!getTodo(id)) return json({ error: "todo not found" }, 404);

    if (request.method === "PATCH") {
        const body = await request.json().catch(() => null);
        if (typeof body?.completed !== "boolean") {
            return json({ error: "completed (boolean) is required" }, 400);
        }
        return json(setCompleted(id, body.completed));
    }
    if (request.method === "DELETE") {
        removeTodo(id);
        return json({ ok: true });
    }
    return json({ error: "method not allowed" }, 405);
}
