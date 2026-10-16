import { TodoList } from "@components/Todos.jsx";
import { listTodos } from "../../../store.js";

/** Render the complete list root so the client can patch it in place. */
export default function TodosFragment() {
    return <TodoList todos={listTodos()} />;
}
