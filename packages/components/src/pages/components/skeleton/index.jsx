import { SectionSkeleton } from "../../sections/section-skeleton.jsx";
import { DocLayout } from "../doc-layout.jsx";

export default function SkeletonPage() {
    return (
        <DocLayout title="Skeleton" currentPage="skeleton">
            <SectionSkeleton />
        </DocLayout>
    );
}
