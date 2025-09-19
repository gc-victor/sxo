import { Header } from "@components/Header";
import { Page } from "@components/Page";

export default ({ slug }) => (
    <html lang="en">
        <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>{`Slug - ${slug}`}</title>
        </head>
        <body>
            <Page>
                <Header title={`Slug - ${slug}!`} />
            </Page>
        </body>
    </html>
);
