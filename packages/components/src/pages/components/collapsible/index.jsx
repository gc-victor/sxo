import { SectionCollapsible } from "../../sections/section-collapsible.jsx";
import { DocLayout } from "../doc-layout.jsx";

export default function CollapsiblePage() {
    return (
        <DocLayout title="Collapsible" currentPage="collapsible">
            <SectionCollapsible />
        </DocLayout>
    );
}
