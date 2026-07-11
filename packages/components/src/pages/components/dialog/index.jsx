import { SectionDialog } from "../../sections/section-dialog.jsx";
import { DocLayout } from "../doc-layout.jsx";

export default function DialogPage() {
    return (
        <DocLayout title="Dialog" currentPage="dialog">
            <SectionDialog />
        </DocLayout>
    );
}
