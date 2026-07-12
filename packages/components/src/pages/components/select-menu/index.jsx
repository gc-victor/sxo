import { SectionSelectMenu } from "../../sections/section-select-menu.jsx";
import { DocLayout } from "../doc-layout.jsx";

export default function SelectMenuPage() {
    return (
        <DocLayout title="Select Menu" currentPage="select-menu">
            <SectionSelectMenu />
        </DocLayout>
    );
}
