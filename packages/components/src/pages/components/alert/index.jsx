import { SectionAlert } from "../../sections/section-alert.jsx";
import { DocLayout } from "../doc-layout.jsx";

export default function AlertPage() {
    return (
        <DocLayout title="Alert" currentPage="alert">
            <SectionAlert />
        </DocLayout>
    );
}
