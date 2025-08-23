import { Page } from "@/components/Page";
import { Header } from "@components/Header";

export const head = ({ slug }) => ({ title: `Slug - ${slug}` });
export default ({ slug }) => (
        <Page>
            <Header title={`Slug - ${slug}!`} />
        </Page>
    );
