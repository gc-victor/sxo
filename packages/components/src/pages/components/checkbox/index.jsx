import { SectionCheckbox } from "../../sections/section-checkbox.jsx";
import { DocLayout } from "../doc-layout.jsx";

export default function CheckboxPage() {
    return (
        <DocLayout title="Checkbox" currentPage="checkbox">
            <SectionCheckbox />
        </DocLayout>
    );
}
