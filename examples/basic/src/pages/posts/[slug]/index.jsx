import { Page } from "@components/Page";
import { Header } from "@components/Header";

/**
 * Dynamic post page example using JSONPlaceholder:
 * https://jsonplaceholder.typicode.com/posts/:id
 *
 * Route params shape: { slug: string } where slug is used as the :id
 */

export const head = ({ slug }) => ({
    title: `Post – ${slug}`,
    meta: [{ name: "description", content: `Viewing post ${slug} from jsonplaceholder.` }],
});

export default async ({ slug }) => {
    const post = await fetchPost(slug);

    if (!post || !post.id) {
        return (
            <Page>
                <Header title="Post Not Found" />
                <main class="post-page">
                    <p>We couldn't find a post with id “{slug}”.</p>
                </main>
            </Page>
        );
    }

    return (
        <Page>
            <Header title={post.title} />
            <main class="post-page">
                <article>
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
    );
};

/**
 * @param {string | number} id
 */
 async function fetchPost(id) {
     try {
         const res = await fetch(
             `https://jsonplaceholder.typicode.com/posts/${encodeURIComponent(id)}`
         );
         if (!res.ok) return null;
         return await res.json();
     } catch (error) {
         console.error("Error fetching post:", error);
         return null;
     }
 }
