/**
 * @fileoverview Reusable declarative section components (vanilla JSX)
 *
 * @module ui/sections/section
 * @description
 * Provides semantic section wrapper components with consistent styling for demo pages.
 * Vanilla JSX only: no runtime logic bundled here. Follows declarative composition pattern
 * with separate `<Section>` and `<SectionHeading>` components.
 *
 * Exports:
 * - `<Section>`: Semantic section wrapper element.
 * - `<SectionHeading>`: Styled heading element for sections (defaults to h2).
 *
 * Design notes:
 * - Declarative API: compose `<SectionHeading>` inside `<Section>` explicitly.
 * - `<SectionHeading>` accepts `level` prop (2-6) to customize heading tag.
 * - Both components support native HTML attributes via `...rest`.
 * - Class aliasing (`class` / `className`) supported on both components.
 *
 * @author Víctor García
 * @license MIT
 * @version 1.0.0
 */

import InstallTabs from "../components/install-tabs";

/**
 * Props accepted by `<Section />`.
 *
 * Semantic section wrapper element.
 * Renders a `<section>` with no predefined styling.
 * Inherits native section attributes.
 *
 * @typedef {HTMLElementAttributes & ComponentProps & {
 *   id: string,
 * }} SectionProps
 * @function Section
 * @param {SectionProps} props
 * @returns {JSX.Element} Rendered section markup.
 * @example
 * <Section id="tooltip">
 *   <SectionHeading>Tooltip</SectionHeading>
 *   <div>Content here</div>
 * </Section>
 * @public
 */
export function Section({ class: klass, className, children, id, ...rest }) {
    const cls = ["scroll-mt-32", "mb-20", klass, className].filter(Boolean).join(" ");
    return (
        <section id={id} {...(cls && { className: cls })} {...rest}>
            {children}

            <h3 class="mt-10 text-2xl font-semibold leading-9 tracking-tight">Installation</h3>
            <InstallTabs
                componentName={id}
                commands={{
                    pnpm: `pnpx sxo add ${id}`,
                    npm: `npx sxo add ${id}`,
                    yarn: `yarn sxo add ${id}`,
                    bun: `bunx --bun sxo add ${id}`,
                }}
            />
        </section>
    );
}

/**
 * Props accepted by `<SectionHeading />`.
 *
 * Styled heading element for sections.
 * Renders a heading tag (h2-h6) with consistent typography and spacing.
 * Inherits native heading attributes.
 *
 * @typedef {HTMLHeadingAttributes & ComponentProps & {
 *   level?: 2 | 3 | 4 | 5 | 6,
 * }} SectionHeadingProps
 * @property {2 | 3 | 4 | 5 | 6} [level=2] - Heading level (h2-h6). Defaults to 2.
 * @function SectionHeading
 * @param {SectionHeadingProps} props
 * @returns {JSX.Element} Rendered heading markup.
 * @example
 * <SectionHeading>Tooltip</SectionHeading>
 * @example
 * <SectionHeading level={3}>Demo</SectionHeading>
 * @example
 * <SectionHeading class="custom-heading">Custom</SectionHeading>
 * @public
 */
export function SectionHeading({ class: klass, className, level = 2, children, ...rest }) {
    const cls = ["mb-2 text-4xl font-semibold tracking-tight sm:text-3xl xl:text-4xl", klass, className].filter(Boolean).join(" ");
    const HeadingTag = `h${level}`;

    return (
        <HeadingTag class={cls} {...rest}>
            {children}
        </HeadingTag>
    );
}

/**
 * Props accepted by `<SectionDescription />`.
 *
 * Paragraph component intended to describe the section content.
 * Renders a semantic `<p>` element with muted foreground styling and balanced text wrapping.
 * Inherits native HTML paragraph attributes.
 *
 * @typedef {HTMLParagraphAttributes & ComponentProps & {}} SectionDescriptionProps
 * @function SectionDescription
 * @param {SectionDescriptionProps} props
 * @returns {JSX.Element} Rendered paragraph markup.
 * @example
 * <SectionDescription>This section showcases tooltip usage patterns.</SectionDescription>
 * @public
 */
export function SectionDescription({ class: klass, className, children, ...rest }) {
    const cls = ["mb-8 text-muted-foreground text-balance text-base md:text-xl", klass, className].filter(Boolean).join(" ");
    return (
        <p class={cls} {...rest}>
            {children}
        </p>
    );
}
