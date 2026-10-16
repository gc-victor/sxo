import { addTodo, listTodos } from "../store.js";
import { json } from "./json.js";
import { publishTodosUpdate } from "./todos-events.js";

/** Handle collection requests for /api/todos. */
export async function todosApi(request) {
    const url = new URL(request.url);
    if (url.pathname !== "/api/todos") return;

    if (request.method === "GET") return json(listTodos());
    if (request.method === "POST") {
        const body = await request.json().catch(() => null);
        const title = typeof body?.title === "string" ? body.title.trim() : "";
        if (!title) return json({ error: "title is required" }, 400);
        const todo = addTodo(title);
        publishTodosUpdate();
        return json(todo, 201);
    }
    return json({ error: "method not allowed" }, 405);
}
