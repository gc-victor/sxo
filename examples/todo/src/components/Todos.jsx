import Button from "@sxo/components/src/components/button.jsx";
import Checkbox from "@sxo/components/src/components/checkbox.jsx";
import Input from "@sxo/components/src/components/input.jsx";

function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

export function TodoItem({ todo }) {
    return (
        <li data-key={todo.id} data-id={todo.id}>
            <Checkbox data-action="toggle" {...(todo.completed ? { checked: true } : {})} />
            <span className={todo.completed ? "done" : ""}>{escapeHtml(todo.title)}</span>
            <Button type="button" variant="ghost" data-action="delete" aria-label="Delete todo">
                ×
            </Button>
        </li>
    );
}

export function TodoList({ todos }) {
    return (
        <ul $ref="list" $onclick="onListClick">
            {todos.length ? todos.map((todo) => <TodoItem todo={todo} />) : <li className="empty" data-key="empty">Nothing to do yet.</li>}
        </ul>
    );
}

export function Todos({ todos }) {
    return (
        <rc-todos>
            <div hidden $ref="data">
                {encodeURIComponent(JSON.stringify(todos))}
            </div>
            <form $onsubmit="add">
                <Input
                    type="text"
                    name="title"
                    $bind-value="draft"
                    placeholder="What needs to be done?"
                    aria-label="New todo title"
                    autoComplete="off"
                    required
                />
                <Button type="submit">Add</Button>
            </form>
            <TodoList todos={todos} />
            <p>
                <span $state="remaining">{todos.filter((todo) => !todo.completed).length}</span> remaining
            </p>
        </rc-todos>
    );
}
