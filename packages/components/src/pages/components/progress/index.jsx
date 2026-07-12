import { SectionProgress } from "../../sections/section-progress.jsx";
import { DocLayout } from "../doc-layout.jsx";

export default function ProgressPage() {
    return (
        <DocLayout title="Progress" currentPage="progress">
            <SectionProgress />
        </DocLayout>
    );
}
