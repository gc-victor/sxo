import { TodoItem } from "@components/Todos.jsx";
import { listTodos } from "../../store.js";

/** Render only the list items; the client inserts this response into its <ul>. */
export default function TodosFragment() {
    const todos = listTodos();
    return todos.length ? todos.map((todo) => <TodoItem todo={todo} />) : <li className="empty">Nothing to do yet.</li>;
}
