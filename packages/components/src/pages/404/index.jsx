import { DocLayout } from "../components/doc-layout.jsx";

export default function NotFoundPage() {
    return (
        <DocLayout title="Page not found" currentPage="">
            <div class="grid min-h-[50vh] place-items-center">
                <section class="empty max-w-sm text-center">
                    <header>
                        <h1>Page not found</h1>
                        <p>This page does not exist or may have moved.</p>
                    </header>
                    <footer>
                        <a href="/installation" class="btn" data-size="sm">Installation</a>
                    </footer>
                </section>
            </div>
        </DocLayout>
    );
}
