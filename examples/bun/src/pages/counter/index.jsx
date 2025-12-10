import { Counter } from "./counter.jsx";

export default () => (
    <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Counter - SXO Bun</title>
            <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
        </head>
        <body>
            <main className="flex flex-col items-center justify-center h-screen space-y-8">
                <h1 className="text-4xl font-bold mb-8">Counters</h1>
                <Counter count={0} />
                <Counter count={0} />
                <Counter count={0} />
                <a href="/" className="text-blue-600 hover:underline mt-8">
                    ← Back to Home
                </a>
            </main>
        </body>
    </html>
);
