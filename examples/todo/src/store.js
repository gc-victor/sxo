import { DatabaseSync } from "node:sqlite";

// Resolved relative to the process working directory: run SXO commands
// from this example's root so the file lands at examples/todo/todos.db.
const db = new DatabaseSync("todos.db");

db.exec(`
    CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0
    )
`);

const toTodo = (row) => ({ id: Number(row.id), title: row.title, completed: row.completed === 1 });

function seedIfEmpty() {
    const { count } = db.prepare("SELECT COUNT(*) AS count FROM todos").get();
    if (count > 0) return;
    const insert = db.prepare("INSERT INTO todos (title, completed) VALUES (?, ?)");
    insert.run("Read the SXO docs", 1);
    insert.run("Build a todo app", 0);
    insert.run("Ship to production", 0);
}

seedIfEmpty();

export function listTodos() {
    return db.prepare("SELECT id, title, completed FROM todos ORDER BY id").all().map(toTodo);
}

export function getTodo(id) {
    const row = db.prepare("SELECT id, title, completed FROM todos WHERE id = ?").get(id);
    return row ? toTodo(row) : undefined;
}

export function addTodo(title) {
    const { lastInsertRowid } = db.prepare("INSERT INTO todos (title) VALUES (?)").run(title);
    return getTodo(Number(lastInsertRowid));
}

export function setCompleted(id, completed) {
    db.prepare("UPDATE todos SET completed = ? WHERE id = ?").run(completed ? 1 : 0, id);
    return getTodo(id);
}

export function removeTodo(id) {
    return db.prepare("DELETE FROM todos WHERE id = ?").run(id).changes > 0;
}
