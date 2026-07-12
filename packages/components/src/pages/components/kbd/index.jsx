import { SectionKbd } from "../../sections/section-kbd.jsx";
import { DocLayout } from "../doc-layout.jsx";

export default function KbdPage() {
    return (
        <DocLayout title="Kbd" currentPage="kbd">
            <SectionKbd />
        </DocLayout>
    );
}
