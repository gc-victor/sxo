import { define, swapFragment } from "sxo/client";

define("rc-todos", ({ $state, $on, $ref, $compute }) => {
    // null until hydrated from the server-rendered JSON island (in connected).
    $state.todos = null;

    $compute("remaining", ["todos"], (todos) => (todos ? todos.filter((todo) => !todo.completed).length : 0));

    let events;
    let refreshId = 0;

    async function api(method, path, body) {
        const response = await fetch(path, {
            method,
            headers: { "Content-Type": "application/json" },
            body: body === undefined ? undefined : JSON.stringify(body),
        });
        return response.json();
    }

    async function updateList() {
        const requestId = ++refreshId;
        try {
            const [todos, swapped] = await Promise.all([
                api("GET", "/api/todos"),
                swapFragment("/fragments/todos", $ref.list),
            ]);
            if (requestId !== refreshId || !swapped) return;
            $state.todos = todos;
        } catch (error) {
            console.error("Failed to refresh todos", error);
        }
    }

    $on.add = async (event) => {
        event.preventDefault();
        const title = String($state.draft ?? "").trim();
        if (!title) return;
        await api("POST", "/api/todos", { title });
        $state.draft = "";
    };

    // The list root is patched in place, so its delegated listener survives.
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
    };

    return {
        // Runs after refs/bindings are processed: hydrate from SSR state.
        connected() {
            $state.todos = JSON.parse(decodeURIComponent($ref.data.textContent));
            events = new EventSource("/api/todos/events");
            events.addEventListener("todos-update", () => {
                void updateList();
            });
        },
        disconnected() {
            events?.close();
        },
    };
});
