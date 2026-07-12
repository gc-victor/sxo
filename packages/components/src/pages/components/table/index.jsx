import { SectionTable } from "../../sections/section-table.jsx";
import { DocLayout } from "../doc-layout.jsx";

export default function TablePage() {
    return (
        <DocLayout title="Table" currentPage="table">
            <SectionTable />
        </DocLayout>
    );
}
