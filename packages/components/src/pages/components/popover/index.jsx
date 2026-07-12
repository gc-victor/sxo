import { SectionPopover } from "../../sections/section-popover.jsx";
import { DocLayout } from "../doc-layout.jsx";

export default function PopoverPage() {
    return (
        <DocLayout title="Popover" currentPage="popover">
            <SectionPopover />
        </DocLayout>
    );
}
