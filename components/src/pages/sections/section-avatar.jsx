import Avatar, { AvatarGroup } from "@components/avatar.jsx";
import Tabs, { TabsContent, TabsList, TabsTrigger } from "@components/tabs.jsx";
import CopyButton from "@pages/components/copy-button.jsx";
import highlightJsx from "@pages/components/highlight-jsx.js";
import { Section, SectionDescription, SectionHeading } from "./section.jsx";

export function SectionAvatar() {
    return (
        <Section id="avatar">
            <SectionHeading>Avatar</SectionHeading>
            <SectionDescription>An image element with a fallback for representing the user.</SectionDescription>

            <Tabs variant="default">
                <TabsList>
                    <TabsTrigger name="preview" active>
                        Preview
                    </TabsTrigger>
                    <TabsTrigger name="code">Code</TabsTrigger>
                </TabsList>

                {/* NOTE: Label each example use case in the snippet with inline JSX comments */}
                <TabsContent name="preview" class="pt-4" active>
                    <div class="flex items-center gap-3">
                        {/* Case 1: Avatar with image */}
                        <Avatar
                            loading="lazy"
                            src="https://github.com/hunvreus.png"
                            srcset="https://github.com/hunvreus.png"
                            alt="C Newton"
                            size="lg"
                        />
                        {/* Case 2: Avatar with name fallback */}
                        <Avatar name="Ada Lovelace" />
                        {/* Case 3: Avatar with initials and shape */}
                        <Avatar initials="CN" shape="rounded" />
                        {/* Case 4: AvatarGroup with hover spread */}
                        <AvatarGroup hoverSpread={true}>
                            <Avatar
                                loading="lazy"
                                src="https://github.com/hunvreus.png"
                                srcset="https://github.com/hunvreus.png"
                                alt="A"
                                size="sm"
                            />
                            <Avatar
                                loading="lazy"
                                src="https://github.com/shadcn.png"
                                srcset="https://github.com/shadcn.png"
                                alt="B"
                                size="sm"
                            />
                            <Avatar
                                loading="lazy"
                                src="https://github.com/adamwathan.png"
                                srcset="https://github.com/adamwathan.png"
                                alt="C"
                                size="sm"
                            />
                            <Avatar initials="XY" size="sm" />
                        </AvatarGroup>
                    </div>
                </TabsContent>

                <TabsContent name="code" class="mt-4 relative">
                    <pre className="jsx-highlight">
                        <code id="avatar-code" class="language-jsx">
                            {highlightJsx(`<div class="flex items-center gap-3">
    {/* Case 1: Avatar with image */}
    <Avatar src="https://github.com/hunvreus.png" srcset="https://github.com/hunvreus.png" alt="C Newton" size="lg" />
    {/* Case 2: Avatar with name fallback */}
    <Avatar name="Ada Lovelace" />
    {/* Case 3: Avatar with initials and shape */}
    <Avatar initials="CN" shape="rounded" />
    {/* Case 4: AvatarGroup with hover spread */}
    <AvatarGroup hoverSpread={true}>
        <Avatar src="https://github.com/hunvreus.png" srcset="https://github.com/hunvreus.png" alt="A" size="sm" />
        <Avatar src="https://github.com/shadcn.png" srcset="https://github.com/shadcn.png" alt="B" size="sm" />
        <Avatar src="https://github.com/adamwathan.png" srcset="https://github.com/adamwathan.png" alt="C" size="sm" />
        <Avatar initials="XY" size="sm" />
    </AvatarGroup>
</div>`)}
                        </code>
                    </pre>

                    <CopyButton for="avatar-code" />
                </TabsContent>
            </Tabs>

            <div class="mt-12 space-y-6">
                <h3 class="scroll-m-22 text-2xl font-semibold leading-9 tracking-tight">Usage</h3>
                <div class="prose space-y-4">
                    <p>Use the following primitives to build an example:</p>
                    <ul class="list-disc pl-6 space-y-2">
                        <li>
                            <strong>&lt;Avatar&gt;</strong>: Displays a user image or fallback initials/name. Supports <code>src</code>,{" "}
                            <code>name</code>, <code>initials</code>, <code>size</code>, and <code>shape</code> props.
                        </li>
                        <li>
                            <strong>&lt;AvatarGroup&gt;</strong>: Groups multiple avatars with optional hover spread using{" "}
                            <code>hoverSpread</code> prop.
                        </li>
                    </ul>
                </div>
            </div>
        </Section>
    );
}
