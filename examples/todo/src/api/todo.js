import { getTodo, removeTodo, setCompleted } from "../store.js";
import { json } from "./json.js";
import { publishTodosUpdate } from "./todos-events.js";

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
        const todo = setCompleted(id, body.completed);
        publishTodosUpdate();
        return json(todo);
    }
    if (request.method === "DELETE") {
        if (removeTodo(id)) publishTodosUpdate();
        return json({ ok: true });
    }
    return json({ error: "method not allowed" }, 405);
}
