/**
 * @fileoverview Section showcasing the Table component (vanilla JSX)
 *
 * @module ui/SectionTable
 * @description
 * This section demonstrates various Table component usages,
 * including table headers, body rows, and footer totals.
 * It showcases nested TableCaption, TableHeader, TableHead,
 * TableBody, TableCell, TableRow, and TableFooter components.
 *
 * Exports:
 * - `SectionTable`: Displays different Table component examples.
 *
 * @author Víctor García
 * @license MIT
 * @version 1.0.0
 */

import Table, { TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@components/table.jsx";
import Tabs, { TabsContent, TabsList, TabsTrigger } from "@components/tabs.jsx";
import CopyButton from "@pages/components/copy-button.jsx";
import highlightJsx from "@pages/components/highlight-jsx.js";
import { Section, SectionDescription, SectionHeading } from "./section.jsx";

/**
 * Props accepted by `<SectionTable />`.
 *
 * This component does not accept any custom props.
 * It primarily serves as a container for Table examples.
 *
 * @typedef {HTMLElementAttributes & ComponentProps & {}} SectionTableProps
 * @function SectionTable
 * @param {SectionTableProps} props
 * @returns {JSX.Element} Rendered markup for the Table section.
 * @example
 * <SectionTable />
 * @public
 * @since 1.0.0
 */
export function SectionTable(props) {
    return (
        <Section id="table" {...props}>
            <SectionHeading>Table</SectionHeading>
            <SectionDescription>A responsive table component.</SectionDescription>
            <Tabs variant="default">
                <TabsList>
                    <TabsTrigger name="preview" active>
                        Preview
                    </TabsTrigger>
                    <TabsTrigger name="code">Code</TabsTrigger>
                </TabsList>

                <TabsContent name="preview" class="pt-4" active>
                    <Table>
                        <TableCaption>A list of your recent invoices.</TableCaption>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Invoice</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Method</TableHead>
                                <TableHead class="text-right">Amount</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell class="font-medium">INV001</TableCell>
                                <TableCell>Paid</TableCell>
                                <TableCell>Credit Card</TableCell>
                                <TableCell class="text-right">$250.00</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell class="font-medium">INV002</TableCell>
                                <TableCell>Pending</TableCell>
                                <TableCell>PayPal</TableCell>
                                <TableCell class="text-right">$150.00</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell class="font-medium">INV003</TableCell>
                                <TableCell>Unpaid</TableCell>
                                <TableCell>Bank Transfer</TableCell>
                                <TableCell class="text-right">$350.00</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell class="font-medium">INV004</TableCell>
                                <TableCell>Paid</TableCell>
                                <TableCell>PayPal</TableCell>
                                <TableCell class="text-right">$450.00</TableCell>
                            </TableRow>
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TableCell colspan="3">Total</TableCell>
                                <TableCell class="text-right">$1,200.00</TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </TabsContent>

                <TabsContent name="code" class="mt-4 relative">
                    <pre class="jsx-highlight">
                        <code id="table-code" class="language-jsx">
                            {highlightJsx(`<Table>
    <TableCaption>A list of your recent invoices.</TableCaption>
    <TableHeader>
        <TableRow>
            <TableHead>Invoice</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Method</TableHead>
            <TableHead class="text-right">Amount</TableHead>
        </TableRow>
    </TableHeader>
    <TableBody>
        <TableRow>
            <TableCell class="font-medium">INV001</TableCell>
            <TableCell>Paid</TableCell>
            <TableCell>Credit Card</TableCell>
            <TableCell class="text-right">$250.00</TableCell>
        </TableRow>
        <TableRow>
            <TableCell class="font-medium">INV002</TableCell>
            <TableCell>Pending</TableCell>
            <TableCell>PayPal</TableCell>
            <TableCell class="text-right">$150.00</TableCell>
        </TableRow>
        <TableRow>
            <TableCell class="font-medium">INV003</TableCell>
            <TableCell>Unpaid</TableCell>
            <TableCell>Bank Transfer</TableCell>
            <TableCell class="text-right">$350.00</TableCell>
        </TableRow>
        <TableRow>
            <TableCell class="font-medium">INV004</TableCell>
            <TableCell>Paid</TableCell>
            <TableCell>PayPal</TableCell>
            <TableCell class="text-right">$450.00</TableCell>
        </TableRow>
    </TableBody>
    <TableFooter>
        <TableRow>
            <TableCell colspan="3">Total</TableCell>
            <TableCell class="text-right">$1,200.00</TableCell>
        </TableRow>
    </TableFooter>
</Table>`)}
                        </code>
                    </pre>

                    <CopyButton for="table-code" />
                </TabsContent>
            </Tabs>

            <div class="mt-12 space-y-6">
                <h3 class="scroll-m-22 text-2xl font-semibold leading-9 tracking-tight">Usage</h3>
                <div class="prose space-y-4">
                    <p>Use the following primitives to build data tables:</p>
                    <ul class="list-disc pl-6 space-y-2">
                        <li>
                            <strong>&lt;Table&gt;</strong>: The root container for the table structure.
                        </li>
                        <li>
                            <strong>&lt;TableCaption&gt;</strong>: An accessible caption for the table.
                        </li>
                        <li>
                            <strong>&lt;TableHeader&gt;</strong>: Contains the table header rows with column headings.
                        </li>
                        <li>
                            <strong>&lt;TableBody&gt;</strong>: Contains the main table data rows.
                        </li>
                        <li>
                            <strong>&lt;TableFooter&gt;</strong>: Contains footer rows, typically for totals or summaries.
                        </li>
                        <li>
                            <strong>&lt;TableRow&gt;</strong>: Represents a single row in the table.
                        </li>
                        <li>
                            <strong>&lt;TableHead&gt;</strong>: Header cell for column headings.
                        </li>
                        <li>
                            <strong>&lt;TableCell&gt;</strong>: Standard data cell for table content.
                        </li>
                    </ul>
                </div>
            </div>
        </Section>
    );
}
