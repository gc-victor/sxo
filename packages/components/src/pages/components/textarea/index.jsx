import { SectionTextarea } from "../../sections/section-textarea.jsx";
import { DocLayout } from "../doc-layout.jsx";

export default function TextareaPage() {
    return (
        <DocLayout title="Textarea" currentPage="textarea">
            <SectionTextarea />
        </DocLayout>
    );
}
