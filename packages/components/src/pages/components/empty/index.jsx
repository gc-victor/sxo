import { SectionEmpty } from "../../sections/section-empty.jsx";
import { DocLayout } from "../doc-layout.jsx";

export default function EmptyPage() {
    return (
        <DocLayout title="Empty" currentPage="empty">
            <SectionEmpty />
        </DocLayout>
    );
}
