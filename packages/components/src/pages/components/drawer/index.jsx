import { SectionDrawer } from "../../sections/section-drawer.jsx";
import { DocLayout } from "../doc-layout.jsx";

export default function DrawerPage() {
    return (
        <DocLayout title="Drawer" currentPage="drawer">
            <SectionDrawer />
        </DocLayout>
    );
}
