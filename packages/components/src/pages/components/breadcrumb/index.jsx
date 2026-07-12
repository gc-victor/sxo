import { SectionBreadcrumb } from "../../sections/section-breadcrumb.jsx";
import { DocLayout } from "../doc-layout.jsx";

export default function BreadcrumbPage() {
    return (
        <DocLayout title="Breadcrumb" currentPage="breadcrumb">
            <SectionBreadcrumb />
        </DocLayout>
    );
}
