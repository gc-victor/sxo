/**
 * @fileoverview Table components for displaying tabular data (vanilla JSX)
 *
 * @module ui/table
 * @description
 * Accessible, semantic table primitives using declarative composition.
 * Authors compose tables using explicit child components for headers, rows, cells, and footers.
 * No array-based props; full manual control over table structure.
 *
 * Exports:
 * - `Table`: Root table wrapper with optional responsive container.
 * - `TableCaption`: Table caption element.
 * - `TableHeader`: Table header section (<thead>).
 * - `TableBody`: Table body section (<tbody>).
 * - `TableFooter`: Table footer section (<tfoot>).
 * - `TableRow`: Table row (<tr>).
 * - `TableHead`: Header cell (<th>).
 * - `TableCell`: Data cell (<td>).
 *
 * Design notes:
 * - Uses correct table semantics with <caption>, <thead>, <tbody>, <tfoot>, <th>, <td>.
 * - Responsive wrapper uses overflow-x for horizontal scrolling on narrow viewports.
 * - No React dependencies; plain JSX compiled by SXO's transformer.
 * - Manual composition pattern: authors build structure explicitly via child components.
 *
 * @author Víctor García
 * @license MIT
 * @version 1.0.0
 */

import { cn } from "@utils/cn.js";

/**
 * Props accepted by `<Table />`.
 *
 * Root table component with optional responsive wrapper.
 * Renders a <table> element with configurable styling variants.
 * Inherits all native div attributes for the wrapper container.
 *
 * @typedef {HTMLDivAttributes & ComponentProps & {
 *   density?: "default" | "compact",
 *   striped?: boolean,
 *   bordered?: boolean,
 *   responsive?: boolean,
 *   tableClass?: string,
 *   wrapperClass?: string,
 * }} TableProps
 * @function Table
 * @param {TableProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <Table>
 *   <TableBody>
 *     <TableRow>
 *       <TableCell>Data</TableCell>
 *     </TableRow>
 *   </TableBody>
 * </Table>
 * @public
 */
export function Table({
    class: klass,
    className,
    density = "default",
    striped = false,
    bordered = false,
    responsive = true,
    tableClass,
    wrapperClass,
    children,
    ...rest
}) {
    const containerClass = cn(wrapperClass || "table-wrapper", responsive ? "relative w-full overflow-x-auto" : null, klass, className);

    const tClass = cn(
        tableClass || "table",
        "w-full caption-bottom text-sm",
        density === "compact" ? "table-compact" : null,
        striped ? "table-striped" : null,
        bordered ? "table-bordered" : null,
    );

    return (
        <div class={containerClass} data-table-root="" {...rest}>
            <table class={tClass}>{children}</table>
        </div>
    );
}

/**
 * Props accepted by `<TableCaption />`.
 *
 * Table caption element providing title or summary.
 * Inherits all native caption attributes.
 *
 * @typedef {HTMLElementAttributes & ComponentProps & {}} TableCaptionProps
 * @function TableCaption
 * @param {TableCaptionProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <TableCaption>A list of your recent invoices.</TableCaption>
 * @public
 */
export function TableCaption({ class: klass, className, children, ...rest }) {
    const cls = cn("mt-4 text-sm text-muted-foreground", klass, className);
    return (
        <caption class={cls} {...rest}>
            {children}
        </caption>
    );
}

/**
 * Props accepted by `<TableHeader />`.
 *
 * Table header section wrapping header rows.
 * Renders a <thead> element.
 * Inherits all native thead attributes.
 *
 * @typedef {HTMLElementAttributes & ComponentProps & {}} TableHeaderProps
 * @function TableHeader
 * @param {TableHeaderProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <TableHeader>
 *   <TableRow>
 *     <TableHead>Column</TableHead>
 *   </TableRow>
 * </TableHeader>
 * @public
 */
export function TableHeader({ class: klass, className, children, ...rest }) {
    const cls = cn("[&_tr]:border-b", klass, className);
    return (
        <thead class={cls} {...rest}>
            {children}
        </thead>
    );
}

/**
 * Props accepted by `<TableBody />`.
 *
 * Table body section wrapping data rows.
 * Renders a <tbody> element.
 * Inherits all native tbody attributes.
 *
 * @typedef {HTMLElementAttributes & ComponentProps & {}} TableBodyProps
 * @function TableBody
 * @param {TableBodyProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <TableBody>
 *   <TableRow>
 *     <TableCell>Data</TableCell>
 *   </TableRow>
 * </TableBody>
 * @public
 */
export function TableBody({ class: klass, className, children, ...rest }) {
    const cls = cn("[&_tr:last-child]:border-0", klass, className);
    return (
        <tbody class={cls} {...rest}>
            {children}
        </tbody>
    );
}

/**
 * Props accepted by `<TableFooter />`.
 *
 * Table footer section wrapping footer rows.
 * Renders a <tfoot> element.
 * Inherits all native tfoot attributes.
 *
 * @typedef {HTMLElementAttributes & ComponentProps & {}} TableFooterProps
 * @function TableFooter
 * @param {TableFooterProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <TableFooter>
 *   <TableRow>
 *     <TableCell>Footer</TableCell>
 *   </TableRow>
 * </TableFooter>
 * @public
 */
export function TableFooter({ class: klass, className, children, ...rest }) {
    const cls = cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", klass, className);
    return (
        <tfoot class={cls} {...rest}>
            {children}
        </tfoot>
    );
}

/**
 * Props accepted by `<TableRow />`.
 *
 * Table row element wrapping cells.
 * Renders a <tr> element.
 * Inherits all native tr attributes.
 *
 * @typedef {HTMLTableRowAttributes & ComponentProps & {}} TableRowProps
 * @function TableRow
 * @param {TableRowProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <TableRow>
 *   <TableCell>Data</TableCell>
 * </TableRow>
 * @public
 */
export function TableRow({ class: klass, className, children, ...rest }) {
    const cls = cn("border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted", klass, className);
    return (
        <tr class={cls} {...rest}>
            {children}
        </tr>
    );
}

/**
 * Props accepted by `<TableHead />`.
 *
 * Table header cell element.
 * Renders a <th> element with scope="col" by default.
 * Inherits all native th attributes.
 *
 * @typedef {HTMLTableCellAttributes & ComponentProps & {
 *   scope?: string,
 * }} TableHeadProps
 * @function TableHead
 * @param {TableHeadProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <TableHead>Name</TableHead>
 * @public
 */
export function TableHead({ class: klass, className, scope = "col", children, ...rest }) {
    const cls = cn("h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0", klass, className);
    return (
        <th scope={scope} class={cls} {...rest}>
            {children}
        </th>
    );
}

/**
 * Props accepted by `<TableCell />`.
 *
 * Table data cell element.
 * Renders a <td> element.
 * Inherits all native td attributes.
 *
 * @typedef {HTMLTableCellAttributes & ComponentProps & {}} TableCellProps
 * @function TableCell
 * @param {TableCellProps} props
 * @returns {JSX.Element} Rendered markup.
 * @example
 * <TableCell>Value</TableCell>
 * @public
 */
export function TableCell({ class: klass, className, children, ...rest }) {
    const cls = cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", klass, className);
    return (
        <td class={cls} {...rest}>
            {children}
        </td>
    );
}

export default Table;
