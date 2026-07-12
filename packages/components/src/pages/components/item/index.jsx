import { SectionItem } from "../../sections/section-item.jsx";
import { DocLayout } from "../doc-layout.jsx";

export default function ItemPage() {
    return (
        <DocLayout title="Item" currentPage="item">
            <SectionItem />
        </DocLayout>
    );
}
