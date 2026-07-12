import { SectionField } from "../../sections/section-field.jsx";
import { DocLayout } from "../doc-layout.jsx";

export default function FieldPage() {
    return (
        <DocLayout title="Field" currentPage="field">
            <SectionField />
        </DocLayout>
    );
}
