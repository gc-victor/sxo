import { Accordion, AccordionContent, AccordionHeader, AccordionItem } from "@components/accordion.jsx";
import Tabs, { TabsContent, TabsList, TabsTrigger } from "@components/tabs.jsx";
import highlightJsx from "@utils/highlight-jsx.js";
import CopyButton from "../components/copy-button.jsx";
import { Section, SectionDescription, SectionHeading } from "./section.jsx";

export function SectionAccordion() {
    return (
        <Section id="accordion">
            <SectionHeading>Accordion</SectionHeading>
            <SectionDescription>A vertically stacked set of interactive headings that each reveal a section of content.</SectionDescription>
            <Tabs variant="default">
                <TabsList>
                    <TabsTrigger name="preview" active>
                        Preview
                    </TabsTrigger>
                    <TabsTrigger name="code">Code</TabsTrigger>
                </TabsList>
                <TabsContent name="preview" class="pt-4" active>
                    <Accordion type="single">
                        <AccordionItem>
                            <AccordionHeader>Is it accessible?</AccordionHeader>
                            <AccordionContent>Yes. It adheres to the WAI-ARIA design pattern.</AccordionContent>
                        </AccordionItem>
                        <AccordionItem>
                            <AccordionHeader>Is it styled?</AccordionHeader>
                            <AccordionContent>Yes. It comes styled to match the rest of the components.</AccordionContent>
                        </AccordionItem>
                        <AccordionItem>
                            <AccordionHeader>Is it animated?</AccordionHeader>
                            <AccordionContent>Yes. It's animated by default.</AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </TabsContent>
                <TabsContent name="code" class="mt-4 relative">
                    <pre className="jsx-highlight">
                        <code id="accordion-code" class="language-jsx">
                            {highlightJsx(`<Accordion type="single">
    <AccordionItem>
        <AccordionHeader>Is it accessible?</AccordionHeader>
        <AccordionContent>Yes. It adheres to the WAI-ARIA design pattern.</AccordionContent>
    </AccordionItem>
    <AccordionItem>
        <AccordionHeader>Is it styled?</AccordionHeader>
        <AccordionContent>Yes. It comes styled to match the rest of the components.</AccordionContent>
    </AccordionItem>
    <AccordionItem>
        <AccordionHeader>Is it animated?</AccordionHeader>
        <AccordionContent>Yes. It's animated by default.</AccordionContent>
    </AccordionItem>
</Accordion>`)}
                        </code>
                    </pre>

                    <CopyButton for="accordion-code" />
                </TabsContent>
            </Tabs>
            <div class="mt-12 space-y-6">
                <h3 class="scroll-m-22 text-2xl font-semibold leading-9 tracking-tight">Usage</h3>
                <div class="prose space-y-4">
                    <p>Use the following primitives to build an accordion:</p>
                    <ul class="list-disc pl-6 space-y-2">
                        <li>
                            <strong>&lt;Accordion&gt;</strong>: Root container that configures behavior via the <code>type</code> prop (
                            <code>single</code> or <code>multiple</code>).
                        </li>
                        <li>
                            <strong>&lt;AccordionItem&gt;</strong>: Wrap each item. Renders a native details element. Add the{" "}
                            <code>open</code> attribute to default an item as expanded.
                        </li>
                        <li>
                            <strong>&lt;AccordionHeader&gt;</strong>: Clickable header. Renders a summary with a heading and optional
                            chevron icon; hide the icon with <code>hideIcon</code>.
                        </li>
                        <li>
                            <strong>&lt;AccordionContent&gt;</strong>: Panel content. Renders a section by default; override the element
                            with the <code>as</code> prop.
                        </li>
                    </ul>
                </div>
            </div>
        </Section>
    );
}
