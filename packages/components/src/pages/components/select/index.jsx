import { SectionSelect } from "../../sections/section-select.jsx";
import { DocLayout } from "../doc-layout.jsx";

export default function SelectPage() {
    return (
        <DocLayout title="Select" currentPage="select">
            <SectionSelect />
        </DocLayout>
    );
}
