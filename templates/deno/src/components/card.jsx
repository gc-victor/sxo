/**
 * @fileoverview Structural Card component set (vanilla JSX) providing unopinionated layout
 * primitives (root container, header, title, description, section, footer) for composable UI.
 * Designed for SXO's vanilla JSX transformer (NOT React) and emits static markup only.
 *
 * Exports:
 * - Card
 * - CardHeader
 * - CardHeaderTitle
 * - CardHeaderDescription
 * - CardSection
 * - CardFooter
 *
 * Design notes:
 * - Purely presentational: no state, side effects, or event wiring.
 * - No auto‑generated ids or `data-*` attributes; caller composes semantics explicitly.
 * - `className` is accepted everywhere as an alias for `class`; both merged deterministically.
 * - Header/title/description helpers return an empty string ("") when provided no meaningful
 *   content (prevents extraneous empty semantic wrappers).
 * - `CardHeader` optionally accepts `title` / `description` props OR arbitrary `children`. When
 *   `children` is supplied, `title`/`description` are ignored and the caller manages structure.
 *
 * Accessibility:
 * - Choose appropriate heading level via `CardHeaderTitle level={n}` to fit page outline.
 * - Prefer semantic regions (<header>, <section>, <footer>) only when content is meaningful.
 * - Avoid skipping heading levels (e.g., do not jump from h2 → h5 without intermediary context).
 *
 * @module ui/card
 * @author Victor García
 * @license MIT
 * @version 1.0.0
 * @since 1.0.0
 */

import { cn } from "@utils/cn.js";

/* -------------------------------------------------------------------------------------------------
 * Card (root)
 * ------------------------------------------------------------------------------------------------- */
/**
 * Props accepted by `<Card />`.
 *
 * Root card container providing a structural wrapper with baseline styling hook (`card` class)
 * and deterministic merging of `class` / `className`. Forwards all additional attributes
 * (aria-*, data-*, etc.). Does not enforce internal layout—composition left to caller.
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {
 * }} CardProps
 * @function Card
 * @param {CardProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <Card class="p-6 space-y-4">
 *   <CardHeader title="Account" description="Manage your profile & credentials." />
 *   <CardSection>...</CardSection>
 *   <CardFooter>Updated just now</CardFooter>
 * </Card>
 * @public
 * @since 1.0.0
 */
export default function Card({ class: klass, className, children, ...rest }) {
    return (
        <div class={cn("card", klass, className)} {...rest}>
            {children}
        </div>
    );
}

/* -------------------------------------------------------------------------------------------------
 * CardHeader
 * ------------------------------------------------------------------------------------------------- */
/**
 * Props accepted by `<CardHeader />`.
 *
 * Optional header region. Returns an empty string when no content would be produced
 * (prevents empty <header> markup).
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {
 * }} CardHeaderProps
 * @function CardHeader
 * @param {CardHeaderProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <CardHeader>
 *   <CardHeaderTitle level={3}>Custom Layout</CardHeaderTitle>
 *   <CardHeaderDescription>Arbitrary child composition.</CardHeaderDescription>
 * </CardHeader>
 * @public
 * @since 1.0.0
 */
export function CardHeader({ children, class: klass, className, ...rest }) {
    if (!children) return "";
    return (
        <header class={cn(klass, className)} {...rest}>
            {children}
        </header>
    );
}

/* -------------------------------------------------------------------------------------------------
 * CardHeaderTitle
 * ------------------------------------------------------------------------------------------------- */
/**
 * Props accepted by `<CardHeaderTitle />`.
 *
 * Heading element rendered at a validated level (1–6). Defaults to level 2 when `level` is
 * absent or invalid. Returns an empty string if `children` are nullish or empty (prevents
 * empty heading tags).
 *
 * @typedef {HTMLHeadingAttributes & ComponentProps & {
 *   level?: number|string
 * }} CardHeaderTitleProps
 * @function CardHeaderTitle
 * @param {CardHeaderTitleProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <CardHeaderTitle level={3}>Details</CardHeaderTitle>
 * @example
 * <CardHeaderTitle>Section Title (defaults to h2)</CardHeaderTitle>
 * @public
 * @since 1.0.0
 */
export function CardHeaderTitle({ level, children, class: klass, className, ...rest }) {
    if (children == null || children === "") return "";
    const numericLevel = Number(level);
    const lvl = numericLevel >= 1 && numericLevel <= 6 ? numericLevel : 2;
    const Tag = `h${lvl}`;
    return (
        <Tag class={cn(klass, className)} {...rest}>
            {children}
        </Tag>
    );
}

/* -------------------------------------------------------------------------------------------------
 * CardHeaderDescription
 * ------------------------------------------------------------------------------------------------- */
/**
 * Props accepted by `<CardHeaderDescription />`.
 *
 * Paragraph-level descriptive text for a header region. Returns an empty string if content is
 * absent or empty. For extended rich content, compose arbitrary markup instead.
 *
 * @typedef {HTMLParagraphAttributes & ComponentProps & {
 * }} CardHeaderDescriptionProps
 * @function CardHeaderDescription
 * @param {CardHeaderDescriptionProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <CardHeaderDescription>Last updated 5 minutes ago.</CardHeaderDescription>
 * @public
 * @since 1.0.0
 */
export function CardHeaderDescription({ children, class: klass, className, ...rest }) {
    if (children == null || children === "") return "";
    return (
        <p class={cn(klass, className)} {...rest}>
            {children}
        </p>
    );
}

/* -------------------------------------------------------------------------------------------------
 * CardSection
 * ------------------------------------------------------------------------------------------------- */
/**
 * Props accepted by `<CardSection />`.
 *
 * Semantic content section rendered as `<section>`. Intended for repeatable grouped content
 * blocks inside a Card. Does not enforce spacing—caller applies layout utilities.
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {
 * }} CardSectionProps
 * @function CardSection
 * @param {CardSectionProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <CardSection class="space-y-4">
 *   <p>Body content...</p>
 * </CardSection>
 * @public
 * @since 1.0.0
 */
export function CardSection({ children, class: klass, className, ...rest }) {
    return (
        <section class={cn(klass, className)} {...rest}>
            {children}
        </section>
    );
}

/* -------------------------------------------------------------------------------------------------
 * CardFooter
 * ------------------------------------------------------------------------------------------------- */
/**
 * Props accepted by `<CardFooter />`.
 *
 * Concluding region for actions or meta information. Renders a semantic `<footer>` wrapper.
 * Content is rendered verbatim; spacing/alignment left to consumer utilities.
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {
 * }} CardFooterProps
 * @function CardFooter
 * @param {CardFooterProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <CardFooter class="flex justify-end gap-2">
 *   <button class="btn-secondary">Cancel</button>
 *   <button class="btn-primary">Save</button>
 * </CardFooter>
 * @public
 * @since 1.0.0
 */
export function CardFooter({ children, class: klass, className, ...rest }) {
    return (
        <footer class={cn(klass, className)} {...rest}>
            {children}
        </footer>
    );
}
