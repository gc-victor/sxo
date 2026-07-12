import { SectionBadge } from "../../sections/section-badge.jsx";
import { DocLayout } from "../doc-layout.jsx";

export default function BadgePage() {
    return (
        <DocLayout title="Badge" currentPage="badge">
            <SectionBadge />
        </DocLayout>
    );
}
