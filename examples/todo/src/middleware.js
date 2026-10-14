import { todoApi } from "./api/todo.js";
import { todosApi } from "./api/todos.js";

// Middleware runs in order; each API entry point falls through when unmatched.
export default [todosApi, todoApi];
