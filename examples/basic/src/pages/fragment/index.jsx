import { Header } from "@components/Header";
import { Page } from "@components/Page";

export default () => (
    <Page>
        <Header title="Fragment Test" />
        <p>This page returns a fragment instead of full HTML.</p>
    </Page>
);
