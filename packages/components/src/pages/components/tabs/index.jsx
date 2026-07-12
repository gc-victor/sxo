import { SectionTabs } from "../../sections/section-tabs.jsx";
import { DocLayout } from "../doc-layout.jsx";

export default function TabsPage() {
    return (
        <DocLayout title="Tabs" currentPage="tabs">
            <SectionTabs />
        </DocLayout>
    );
}
