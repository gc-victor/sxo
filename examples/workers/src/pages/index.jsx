import { Header } from "@components/Header";
import { Page } from "@components/Page";
import docs from "./docs.json";

export const head = {
    title: docs.title,
    meta: [
        { name: "description", content: docs.description },
        { name: "keywords", content: docs.keywords },
    ],
};
export default () => (
    <Page>
        <Header title={docs.title} />
        <main>
            <h2>{docs.subtitle}!</h2>
            <p>{docs.content}</p>
        </main>
    </Page>
);
