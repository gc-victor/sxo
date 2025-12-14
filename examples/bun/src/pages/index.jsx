export default function Index() {
    return (
        <html lang="en">
            <head>
                <title>SXO Bun Example</title>
            </head>
            <body>
                <h1>Welcome to SXO</h1>
                <p>Running on Bun</p>
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
                    <li>
                        <a href="/shop/electronics/laptop">Shop (Multi-param)</a>
                    </li>
                </ul>
            </body>
        </html>
    );
}
