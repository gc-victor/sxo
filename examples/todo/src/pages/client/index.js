import { define } from "sxo/client";

define("rc-todos", ({ $state, $on, $ref, $compute }) => {
    // null until hydrated from the server-rendered JSON island (in connected).
    $state.todos = null;

    $compute("remaining", ["todos"], (todos) => (todos ? todos.filter((todo) => !todo.completed).length : 0));

    async function api(method, path, body) {
        const response = await fetch(path, {
            method,
            headers: { "Content-Type": "application/json" },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
        return response.json();
    }

    async function refreshList() {
        const response = await fetch("/fragments/todos");
        if (!response.ok) throw new Error("Failed to refresh todos");
        $ref.list.innerHTML = await response.text();
    }

    $on.add = async (event) => {
        event.preventDefault();
        const title = String($state.draft ?? "").trim();
        if (!title) return;
        await api("POST", "/api/todos", { title });
        $state.draft = "";
        $state.todos = await api("GET", "/api/todos");
        await refreshList();
    };

    // One delegated listener survives server-rendered fragment replacement.
    $on.onListClick = async (event) => {
        const action = event.target.closest("[data-action]")?.dataset.action;
        const item = event.target.closest("li[data-id]");
        if (!action || !item) return;
        const id = item.dataset.id;

        if (action === "toggle") {
            // The checkbox has already flipped; persist the new value.
            await api("PATCH", `/api/todos/${id}`, { completed: item.querySelector("input").checked });
        } else if (action === "delete") {
            await api("DELETE", `/api/todos/${id}`);
        }
        $state.todos = await api("GET", "/api/todos");
        await refreshList();
    };

    return {
        // Runs after refs/bindings are processed: hydrate from SSR state.
        connected() {
            $state.todos = JSON.parse(decodeURIComponent($ref.data.textContent));
        },
    };
});
