import assert from "node:assert/strict";
import { test } from "node:test";
import modules from "../dist/server/modules.js";
import { addTodo, removeTodo } from "../src/store.js";
import { todoApi } from "../src/api/todo.js";
import { todosApi } from "../src/api/todos.js";
import { todosEventsApi } from "../src/api/todos-events.js";

test("the page and fragment render identical list markup and escape todo titles", () => {
    const todo = addTodo('<script>alert("x")</script> & todo');
    try {
        const page = modules["src/pages/index.jsx"].default();
        const fragment = modules["src/pages/fragments/todos/index.jsx"].default();
        const list = page.match(/<ul\b[^>]*>[\s\S]*?<\/ul>/)?.[0];

        assert.ok(list, "the full page contains a todo list");
        assert.equal(fragment, list);
        assert.match(fragment, /<input type="checkbox" class="input" data-action="toggle"/);
        assert.match(fragment, /<button type="button" class="btn[^"]*"[^>]*data-action="delete"/);
        assert.match(page, /<input type="text" class="input" name="title" \$bind-value="draft"/);
        assert.match(page, /<button type="submit" class="btn[^"]*">Add<\/button>/);
        assert.match(fragment, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt; &amp; todo/);
        assert.doesNotMatch(fragment, /<script>/);
    } finally {
        removeTodo(todo.id);
    }
});

test("SSE notifies connected clients after successful mutations", async () => {
    const response = todosEventsApi(new Request("http://localhost/api/todos/events"));
    assert.equal(response.headers.get("content-type"), "text/event-stream; charset=utf-8");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    assert.equal(decoder.decode((await reader.read()).value), ": connected\n\n");

    let todoId;
    try {
        const created = await todosApi(
            new Request("http://localhost/api/todos", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: "SSE test todo" }),
            }),
        );
        assert.equal(created.status, 201);
        const todo = await created.json();
        todoId = todo.id;
        assert.equal(decoder.decode((await reader.read()).value), "event: todos-update\ndata: update\n\n");

        const updated = await todoApi(
            new Request(`http://localhost/api/todos/${todo.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ completed: true }),
            }),
        );
        assert.equal(updated.status, 200);
        assert.equal(decoder.decode((await reader.read()).value), "event: todos-update\ndata: update\n\n");

        const deleted = await todoApi(new Request(`http://localhost/api/todos/${todo.id}`, { method: "DELETE" }));
        assert.equal(deleted.status, 200);
        todoId = undefined;
        assert.equal(decoder.decode((await reader.read()).value), "event: todos-update\ndata: update\n\n");
    } finally {
        await reader.cancel();
        if (todoId) removeTodo(todoId);
    }
});

test("the SSE endpoint rejects other methods and closes on request abort", async () => {
    assert.equal(todosEventsApi(new Request("http://localhost/api/other")), undefined);
    const methodResponse = todosEventsApi(new Request("http://localhost/api/todos/events", { method: "POST" }));
    assert.equal(methodResponse.status, 405);

    const abort = new AbortController();
    const response = todosEventsApi(new Request("http://localhost/api/todos/events", { signal: abort.signal }));
    const reader = response.body.getReader();
    await reader.read();
    abort.abort();
    assert.equal((await reader.read()).done, true);
});
