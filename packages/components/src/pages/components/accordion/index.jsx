import { SectionAccordion } from "../../sections/section-accordion.jsx";
import { DocLayout } from "../doc-layout.jsx";

export default function AccordionPage() {
    return (
        <DocLayout title="Accordion" currentPage="accordion">
            <SectionAccordion />
        </DocLayout>
    );
}
