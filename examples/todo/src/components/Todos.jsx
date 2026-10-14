/**
 * Server-rendered list item. The client island re-renders items with
 * identical markup (see renderList in src/pages/client/index.js), so the
 * page looks the same before and after hydration.
 */
export function TodoItem({ todo }) {
    return (
        <li data-id={todo.id}>
            <input type="checkbox" data-action="toggle" {...(todo.completed ? { checked: true } : {})} />
            <span className={todo.completed ? "done" : ""}>{todo.title}</span>
            <button type="button" data-action="delete" aria-label="Delete todo">
                ×
            </button>
        </li>
    );
}

/**
 * The todo island: static markup + directives, hydrated by rc-todos.
 * The hidden div carries a URI-encoded JSON snapshot, decoded by the client
 * during hydration.
 */
export function Todos({ todos }) {
    return (
        <rc-todos>
            <div hidden $ref="data">
                {encodeURIComponent(JSON.stringify(todos))}
            </div>
            <form $onsubmit="add">
                <input
                    type="text"
                    name="title"
                    $bind-value="draft"
                    placeholder="What needs to be done?"
                    aria-label="New todo title"
                    autoComplete="off"
                    required
                />
                <button type="submit">Add</button>
            </form>
            <ul $ref="list" $onclick="onListClick">
                {todos.length ? todos.map((todo) => <TodoItem todo={todo} />) : <li className="empty">Nothing to do yet.</li>}
            </ul>
            <p>
                <span $state="remaining">{todos.filter((todo) => !todo.completed).length}</span> remaining
            </p>
        </rc-todos>
    );
}
