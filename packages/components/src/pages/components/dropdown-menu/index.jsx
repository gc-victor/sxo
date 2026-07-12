import { SectionDropdownMenu } from "../../sections/section-dropdown-menu.jsx";
import { DocLayout } from "../doc-layout.jsx";

export default function DropdownMenuPage() {
    return (
        <DocLayout title="Dropdown Menu" currentPage="dropdown-menu">
            <SectionDropdownMenu />
        </DocLayout>
    );
}
