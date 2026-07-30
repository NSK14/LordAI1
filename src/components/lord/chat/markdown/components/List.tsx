/// <reference types="react/jsx-runtime" />
/** @jsxImportSource react */

"use client";

import { cn } from "@/lib/utils";

interface ListProps extends React.HTMLAttributes<HTMLUListElement | HTMLOListElement> {
  ordered?: boolean;
  start?: number;
  children: React.ReactNode;
}

export function List({ ordered = false, start, children, className, ...props }: ListProps) {
  const Component = ordered ? "ol" : "ul";
  
  return (
    <Component
      className={cn(
        "space-y-1.5 pl-6 my-4",
        ordered ? "list-decimal" : "list-disc",
        className
      )}
      start={start}
      {...props}
    >
      {children}
    </Component>
  );
}

interface ListItemProps extends React.HTMLAttributes<HTMLLIElement> {
  children: React.ReactNode;
}

export function ListItem({ children, className, ...props }: ListItemProps) {
  return (
    <li
      className={cn("leading-relaxed text-foreground/90", className)}
      {...props}
    >
      {children}
    </li>
  );
}