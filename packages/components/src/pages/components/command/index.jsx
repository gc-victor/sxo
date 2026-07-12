import { SectionCommand } from "../../sections/section-command.jsx";
import { DocLayout } from "../doc-layout.jsx";

export default function CommandPage() {
    return (
        <DocLayout title="Command" currentPage="command">
            <SectionCommand />
        </DocLayout>
    );
}
