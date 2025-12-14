/**
 * @fileoverview Shop product page - SXO Deno template with multi-param routing.
 */
/* @jsx-ignore */

export default function ShopProduct({ category, product }: { category: string; product: string }) {
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
