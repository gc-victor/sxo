import { SectionLabel } from "../../sections/section-label.jsx";
import { DocLayout } from "../doc-layout.jsx";

export default function LabelPage() {
    return (
        <DocLayout title="Label" currentPage="label">
            <SectionLabel />
        </DocLayout>
    );
}
