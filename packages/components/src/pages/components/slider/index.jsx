import { SectionSlider } from "../../sections/section-slider.jsx";
import { DocLayout } from "../doc-layout.jsx";

export default function SliderPage() {
    return (
        <DocLayout title="Slider" currentPage="slider">
            <SectionSlider />
        </DocLayout>
    );
}
