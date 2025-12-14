export default function Index() {
    return (
        <html lang="en">
            <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <title>SXO Cloudflare Workers Example</title>
            </head>
            <body>
                <h1>Welcome to SXO</h1>
                <p>Running on Cloudflare Workers</p>
                <ul>
                    <li>
                        <a href="/about">About</a>
                    </li>
                    <li>
                        <a href="/counter">Counter</a>
                    </li>
                    <li>
                        <a href="/shop/electronics/laptop">Shop (Multi-param)</a>
                    </li>
                    <li>
                        <a href="/api/health">API Health</a>
                    </li>
                </ul>
            </body>
        </html>
    );
}
