/// <reference types="react/jsx-runtime" />
/** @jsxImportSource react */

"use client";

import { cn } from "@/lib/utils";

interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  children: React.ReactNode;
}

export function Table({ children, className, ...props }: TableProps) {
  return (
    <div className={cn("overflow-x-auto my-4 rounded-lg border border-border/30", className)}>
      <table className="w-full border-collapse" {...props}>
        {children}
      </table>
    </div>
  );
}

interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

export function TableHeader({ children, className, ...props }: TableHeaderProps) {
  return (
    <thead className={cn("bg-white/5", className)} {...props}>
      {children}
    </thead>
  );
}

interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  children: React.ReactNode;
}

export function TableBody({ children, className, ...props }: TableBodyProps) {
  return (
    <tbody className={cn("divide-y divide-border/20", className)} {...props}>
      {children}
    </tbody>
  );
}

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  children: React.ReactNode;
}

export function TableRow({ children, className, ...props }: TableRowProps) {
  return (
    <tr className={cn("hover:bg-white/5 transition-colors", className)} {...props}>
      {children}
    </tr>
  );
}

interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}

export function TableHead({ children, className, ...props }: TableHeadProps) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-left font-semibold text-foreground/90 border-b border-border/30",
        "bg-white/5",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  children: React.ReactNode;
}

export function TableCell({ children, className, ...props }: TableCellProps) {
  return (
    <td
      className={cn("px-4 py-3 text-foreground/80 border-b border-border/10", className)}
      {...props}
    >
      {children}
    </td>
  );
}

interface TableCaptionProps extends React.HTMLAttributes<HTMLTableCaptionElement> {
  children: React.ReactNode;
}

export function TableCaption({ children, className, ...props }: TableCaptionProps) {
  return (
    <caption className={cn("px-4 py-2 text-sm text-foreground/60 text-left", className)} {...props}>
      {children}
    </caption>
  );
}
