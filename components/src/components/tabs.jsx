/**
 * @fileoverview Accessible tabs primitives (vanilla JSX) aligned with <el-tabs> custom element.
 *
 * @module ui/tabs
 * @description
 * Server-rendered HTML primitives for a tab interface using a <el-tabs> web component.
 * Client interactivity (selection, keyboard navigation, ARIA updates) is handled by the
 * companion runtime (tabs.client.js).
 *
 * Author usage example:
 * <Tabs>
 *   <TabsList>
 *     <TabsTrigger name="profile" active>Profile</TabsTrigger>
 *     <TabsTrigger name="billing">Billing</TabsTrigger>
 *   </TabsList>
 *   <TabsContent name="profile" active>Profile panel</TabsContent>
 *   <TabsContent name="billing">Billing panel</TabsContent>
 * </Tabs>
 *
 * Accessibility:
 * - Initial server render shows the panel with `active` prop; others hidden.
 * - Without an `active` prop on any panel, runtime activates first tab.
 * - Panels are hidden via "hidden" CSS class.
 *
 * @license MIT
 * @version 1.4.0
 */
import { cn } from "@utils/cn.js";

/**
 * @typedef {HTMLDivAttributes & ComponentProps & {
 *   children?: string,
 *   variant?: "default" | "none",
 * }} TabsProps
 *
 * @function Tabs
 * @param {TabsProps} props
 * @returns {JSX.Element}
 * @public
 */
export function Tabs({ class: klass, className, children, variant = "default", ...rest }) {
    const tabClass = variant === "none" ? undefined : "tabs";
    return (
        <el-tabs>
            <div class={cn(tabClass, klass, className)} {...rest}>
                {children ?? ""}
            </div>
        </el-tabs>
    );
}

/**
 * @typedef {HTMLDivAttributes & ComponentProps} TabsListProps
 *
 * @function TabsList
 * @param {TabsListProps} props
 * @public
 */
export function TabsList({ class: klass, className, children, ...rest }) {
    return (
        <div role="tablist" class={cn("tabs-list", klass, className)} {...rest}>
            {children ?? ""}
        </div>
    );
}

/**
 * @typedef {HTMLButtonAttributes & ComponentProps & {
 *   name: string,
 *   active?: boolean,
 * }} TabsTriggerProps
 *
 * @function TabsTrigger
 * @param {TabsTriggerProps} props
 * @returns {string} Rendered button element with ARIA attributes
 * @public
 */
export function TabsTrigger({ class: klass, className, children, name, active = false, ...rest }) {
    // NOTE: active prop allows SSR of initial active state; runtime (tabs.client.js) will override based on reactive state.
    return (
        <button
            type="button"
            role="tab"
            data-name={name}
            aria-selected={active ? "true" : "false"}
            tabindex={active ? "0" : "-1"}
            $onclick="tabChange"
            class={cn("tabs-trigger", klass, className)}
            aria-label={typeof children === "string" ? children : undefined}
            {...rest}
        >
            {children ?? ""}
        </button>
    );
}

/**
 * @typedef {HTMLDivAttributes & ComponentProps & {
 *   name: string,
 *   active?: boolean,
 * }} TabsContentProps
 *
 * @function TabsContent
 * @param {TabsContentProps} props
 * @public
 */
export function TabsContent({ class: klass, className, children, name, active, ...rest }) {
    // Panels start hidden unless active; runtime manages active attribute and visibility.
    const activeAttr = active ? { active: "" } : {};
    return (
        <div
            role="tabpanel"
            tabindex="-1"
            data-name={name}
            class={cn("tabs-panel", active ? undefined : "hidden", klass, className)}
            {...activeAttr}
            {...rest}
        >
            {children}
        </div>
    );
}

export default Tabs;
