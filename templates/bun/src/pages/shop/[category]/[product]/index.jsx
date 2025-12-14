export default function ShopProduct({ category, product }) {
    return (
        <html lang="en">
            <head>
                <title>
                    {category} - {product} - SXO
                </title>
            </head>
            <body>
                <h1>
                    Shop: {category} / {product}
                </h1>
                <p>
                    Category: <strong>{category}</strong>
                </p>
                <p>
                    Product: <strong>{product}</strong>
                </p>
                <nav>
                    <a href="/">Home</a>
                </nav>
            </body>
        </html>
    );
}
