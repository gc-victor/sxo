import { Header } from "@components/Header";
import { Page } from "@/components/Page";
import docs from "./docs.json";

export default () => (
    <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>{docs.title}</title>
            <meta name="description" content={docs.description} />
            <meta name="keywords" content={docs.keywords} />
        </head>
        <body>
            <Page>
                <Header title={docs.title} />
                <main>
                    <h2>{docs.subtitle}!</h2>
                    <p>{docs.content}</p>
                </main>
            </Page>
        </body>
    </html>
);
