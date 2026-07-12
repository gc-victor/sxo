import { SectionSidebar } from "../../sections/section-sidebar.jsx";
import { DocLayout } from "../doc-layout.jsx";

export default function SidebarPage() {
    return (
        <DocLayout title="Sidebar" currentPage="sidebar">
            <SectionSidebar />
        </DocLayout>
    );
}
