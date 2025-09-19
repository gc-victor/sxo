import { Header } from "@components/Header";
import { Page } from "@components/Page";

const POSTS = [
    { slug: "1", name: "Post #1" },
    { slug: "2", name: "Post #2" },
    { slug: "3", name: "Post #3" },
];

export default () => (
    <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Posts</title>
            <meta name="description" content="Browse JSONPlaceholder posts." />
        </head>
        <body>
            <Page>
                <Header title="Posts" />
                <main class="posts-index">
                    <p>Select a post to view details:</p>
                    <ul class="post-list">
                        {POSTS.map((p) => (
                            <li class="post-item">
                                <a class="post-link" href={`/posts/${p.slug}`}>
                                    {p.name}
                                </a>
                            </li>
                        ))}
                    </ul>
                </main>
            </Page>
        </body>
    </html>
);
