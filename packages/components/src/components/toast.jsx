/**
 * @fileoverview Toast primitives for dynamic notifications (vanilla JSX).
 *
 * Exports:
 * - `Toaster`: Container for toast notifications with alignment options.
 * - `Toast`: Template-based toast region triggered by custom events.
 * - `ToastTitle`: Title component for toast notifications.
 * - `ToastDescription`: Description component for toast notifications.
 * - `ToastAction`: Primary action button inside a toast footer.
 * - `ToastCancel`: Secondary "cancel" button inside a toast footer.
 *
 * Design notes:
 * - Toasts are triggered by 'el-toast:*' custom events with title/description data.
 * - Content is wrapped in <template> and cloned/populated dynamically.
 * - `className` aliases `class`.
 * - Boolean & ARIA attributes follow standards (empty-string presence).
 *
 * @author Victor García
 * @license MIT
 * @version 1.0.0
 */

import { cn } from "@utils/cn.js";

/**
 * Props accepted by `<Toaster />`.
 *
 * Container for toast notifications with configurable alignment.
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {
 *   align?: "start"|"end"|"center",
 * }} ToasterProps
 * @function Toaster
 * @param {ToasterProps} props
 * @returns {JSX.Element} Rendered container div.
 * @example
 * <Toaster align="start">
 *   <Toast category="success">...</Toast>
 * </Toaster>
 * @public
 */
export function Toaster({ align = "end", class: klass, className, children, ...rest }) {
    const dataAlign = align === "end" ? {} : { "data-align": align };
    return (
        <div class={cn("toaster", klass, className)} {...dataAlign} {...rest}>
            {children}
        </div>
    );
}

/**
 * Props accepted by `<ToastTitle />`.
 *
 * Title component for toast notifications. Renders as an h2 element.
 *
 * @typedef {HTMLHeadingAttributes & ComponentProps & {
 *   children?: string|JSX.Element,
 * }} ToastTitleProps
 * @function ToastTitle
 * @param {ToastTitleProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <ToastTitle>Success</ToastTitle>
 * @public
 */
export function ToastTitle({ class: klass, className, children, ...rest }) {
    return (
        <h2 class={cn("toast-title", klass, className)} {...rest}>
            {children}
        </h2>
    );
}

/**
 * Props accepted by `<ToastDescription />`.
 *
 * Description component for toast notifications. Renders as a paragraph element.
 *
 * @typedef {HTMLParagraphAttributes & ComponentProps & {
 *   children?: string|JSX.Element,
 * }} ToastDescriptionProps
 * @function ToastDescription
 * @param {ToastDescriptionProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <ToastDescription>Operation completed successfully.</ToastDescription>
 * @public
 */
export function ToastDescription({ class: klass, className, children, ...rest }) {
    return (
        <p class={cn("toast-description", klass, className)} {...rest}>
            {children}
        </p>
    );
}

/**
 * Props accepted by `<Toast />`.
 *
 * Toast container component that renders children within a <template> tag.
 * The template is cloned and populated when triggered by custom events.
 * Provides the semantic toast wrapper structure.
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {
 *   category: string
 * }} ToastProps
 * @function Toast
 * @param {ToastProps} props
 * @returns {JSX.Element} Rendered markup with template.
 * @example
 * <Toaster>
 *   <Toast category="success">
 *     <section>
 *       <ToastTitle />
 *       <ToastDescription />
 *     </section>
 *   </Toast>
 * </Toaster>
 * @public
 */
export function Toast({ class: klass, className, children, category, ...rest }) {
    return (
        <el-toast data-category={category}>
            <template>
                <div class="toast" data-category={category} $onclick="handleToastClick" aria-atomic="true" aria-hidden="true" {...rest}>
                    <div class={cn("toast-content", klass, className)}>{children}</div>
                </div>
            </template>
        </el-toast>
    );
}
