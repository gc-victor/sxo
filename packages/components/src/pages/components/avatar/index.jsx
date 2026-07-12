import { SectionAvatar } from "../../sections/section-avatar.jsx";
import { DocLayout } from "../doc-layout.jsx";

export default function AvatarPage() {
    return (
        <DocLayout title="Avatar" currentPage="avatar">
            <SectionAvatar />
        </DocLayout>
    );
}
