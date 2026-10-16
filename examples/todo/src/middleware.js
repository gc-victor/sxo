import { todoApi } from "./api/todo.js";
import { todosApi } from "./api/todos.js";
import { todosEventsApi } from "./api/todos-events.js";

// Middleware runs in order; each API entry point falls through when unmatched.
export default [todosApi, todoApi, todosEventsApi];
