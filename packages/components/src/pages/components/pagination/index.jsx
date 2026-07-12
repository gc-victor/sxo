import { SectionPagination } from "../../sections/section-pagination.jsx";
import { DocLayout } from "../doc-layout.jsx";

export default function PaginationPage() {
    return (
        <DocLayout title="Pagination" currentPage="pagination">
            <SectionPagination />
        </DocLayout>
    );
}
