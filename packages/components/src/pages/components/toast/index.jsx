import { SectionToast } from "../../sections/section-toast.jsx";
import { DocLayout } from "../doc-layout.jsx";

export default function ToastPage() {
    return (
        <DocLayout title="Toast" currentPage="toast">
            <SectionToast />
        </DocLayout>
    );
}
