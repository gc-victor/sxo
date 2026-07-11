import { SectionCard } from "../../sections/section-card.jsx";
import { DocLayout } from "../doc-layout.jsx";

export default function CardPage() {
    return (
        <DocLayout title="Card" currentPage="card">
            <SectionCard />
        </DocLayout>
    );
}
