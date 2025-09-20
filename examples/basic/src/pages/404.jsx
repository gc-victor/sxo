export default () => (
    <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <meta name="robots" content="noindex" />
            <title>404 · Page Not Found</title>
            <style>
                {`
                :root { color-scheme: light dark; }
                html, body { height: 100%; }
                body {
                    margin: 0;
                    font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica, Arial;
                    line-height: 1.5;
                }
                main {
                    min-height: 100vh;
                    display: grid;
                    place-items: center;
                    padding: 2rem;
                }
                .box {
                    max-width: 40rem;
                }
                h1 { margin: 0 0 0.5rem 0; font-size: 2rem; }
                p { margin: 0.25rem 0 1rem 0; }
                `}
            </style>
        </head>
        <body>
            <main>
                <div className="box">
                    <h1 id="nf-title">404 · Page Not Found</h1>
                    <p>The page you’re looking for doesn’t exist or may have moved.</p>
                    <p>
                        <a href="/">Go back home</a>
                    </p>
                </div>
            </main>
        </body>
    </html>
);
