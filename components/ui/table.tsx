import React from 'react';
import { cn } from '@/lib/utils';

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
    children: React.ReactNode;
}

interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
    children: React.ReactNode;
}

interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
    children: React.ReactNode;
}

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
    children: React.ReactNode;
}

interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
    children: React.ReactNode;
}

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
    children: React.ReactNode;
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
    ({ className, children, ...props }, ref) => (
        <div className="relative w-full overflow-auto">
            <table
                ref={ref}
                className={cn(
                    "w-full caption-bottom text-sm border-collapse",
                    className
                )}
                {...props}
            >
                {children}
            </table>
        </div>
    )
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, TableHeaderProps>(
    ({ className, children, ...props }, ref) => (
        <thead
            ref={ref}
            className={cn("border-b bg-gray-50/50", className)}
            {...props}
        >
        {children}
        </thead>
    )
);
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, TableBodyProps>(
    ({ className, children, ...props }, ref) => (
        <tbody
            ref={ref}
            className={cn("divide-y divide-gray-200", className)}
            {...props}
        >
        {children}
        </tbody>
    )
);
TableBody.displayName = "TableBody";

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
    ({ className, children, ...props }, ref) => (
        <tr
            ref={ref}
            className={cn(
                "hover:bg-gray-50 transition-colors",
                className
            )}
            {...props}
        >
            {children}
        </tr>
    )
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
    ({ className, children, ...props }, ref) => (
        <th
            ref={ref}
            className={cn(
                "h-12 px-4 text-left align-middle font-medium text-gray-900 text-sm",
                className
            )}
            {...props}
        >
            {children}
        </th>
    )
);
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
    ({ className, children, ...props }, ref) => (
        <td
            ref={ref}
            className={cn(
                "p-4 align-middle text-gray-700 text-sm",
                className
            )}
            {...props}
        >
            {children}
        </td>
    )
);
TableCell.displayName = "TableCell";

export {
    Table,
    TableHeader,
    TableBody,
    TableHead,
    TableRow,
    TableCell,
};