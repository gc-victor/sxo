import { SectionInput } from "../../sections/section-input.jsx";
import { DocLayout } from "../doc-layout.jsx";

export default function InputPage() {
    return (
        <DocLayout title="Input" currentPage="input">
            <SectionInput />
        </DocLayout>
    );
}
