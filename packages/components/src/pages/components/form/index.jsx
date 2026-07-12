import { SectionForm } from "../../sections/section-form.jsx";
import { DocLayout } from "../doc-layout.jsx";

export default function FormPage() {
    return (
        <DocLayout title="Form" currentPage="form">
            <SectionForm />
        </DocLayout>
    );
}
