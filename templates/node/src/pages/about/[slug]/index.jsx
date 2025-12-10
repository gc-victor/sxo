export default function AboutSlug({ slug }) {
    return (
        <html lang="en">
            <head>
                <title>About {slug} - SXO</title>
            </head>
            <body>
                <h1>About: {slug}</h1>
                <p>
                    This is a dynamic page for slug: <strong>{slug}</strong>
                </p>
                <nav>
                    <a href="/">Home</a> | <a href="/about">About</a>
                </nav>
            </body>
        </html>
    );
}
