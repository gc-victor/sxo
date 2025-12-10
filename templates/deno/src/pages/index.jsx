export default function Index() {
    return (
        <html lang="en">
            <head>
                <title>SXO Deno Example</title>
            </head>
            <body>
                <h1>Welcome to SXO</h1>
                <p>Running on Deno</p>
                <ul>
                    <li>
                        <a href="/about">About</a>
                    </li>
                    <li>
                        <a href="/counter">Counter</a>
                    </li>
                    <li>
                        <a href="/api/health">API Health</a>
                    </li>
                </ul>
            </body>
        </html>
    );
}
