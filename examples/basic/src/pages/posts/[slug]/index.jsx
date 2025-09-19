import { Header } from "@components/Header";
import { Page } from "@components/Page";

/**
 * Dynamic post page example using JSONPlaceholder:
 * https://jsonplaceholder.typicode.com/posts/:id
 *
 * Route params shape: { slug: string } where slug is used as the :id
 */

export default async ({ slug }) => {
    const post = await fetchPost(slug);

    const hasPost = !!post?.id;
    const description = hasPost ? `Viewing post ${slug} from jsonplaceholder.` : `Post ${slug} not found.`;

    return (
        <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>{`Post – ${slug}`}</title>
                <meta name="description" content={description} />
            </head>
            <body>
                {hasPost ? (
                    <Page>
                        <Header title={post.title} />
                        <main class="post-page">
                            <article>
                                {/* Comment */}
                                <h1>{post.title}</h1>
                                <p class="meta">
                                    Post #{post.id} by User #{post.userId}
                                </p>
                                <div class="body">
                                    {post.body.split("\n").map((para) => (
                                        <p>{para}</p>
                                    ))}
                                </div>
                                <p>
                                    <a href="/posts">&larr; Back to posts</a>
                                </p>
                            </article>
                        </main>
                    </Page>
                ) : (
                    <Page>
                        <Header title="Post Not Found" />
                        <main class="post-page">
                            <p>We couldn't find a post with id “{slug}”.</p>
                        </main>
                    </Page>
                )}
            </body>
        </html>
    );
};

/**
 * @param {string | number} id
 */
async function fetchPost(id) {
    try {
        const res = await fetch(`https://jsonplaceholder.typicode.com/posts/${encodeURIComponent(id)}`);
        if (!res.ok) return null;
        return await res.json();
    } catch (error) {
        console.error("Error fetching post:", error);
        return null;
    }
}
