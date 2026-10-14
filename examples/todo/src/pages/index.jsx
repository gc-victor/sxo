import { Todos } from "@components/Todos.jsx";
import { listTodos } from "../store.js";

export default () => (
    <html lang="en">
        <head>
            <meta charSet="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>SXO Todo</title>
        </head>
        <body>
            <main>
                <h1>SXO Todo</h1>
                <p className="tagline">Server-rendered, progressively enhanced, backed by node:sqlite.</p>
                <Todos todos={listTodos()} />
            </main>
        </body>
    </html>
);
