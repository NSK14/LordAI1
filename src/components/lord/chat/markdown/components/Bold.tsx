/// <reference types="react/jsx-runtime" />
/** @jsxImportSource react */

"use client";

import { cn } from "@/lib/utils";

interface BoldProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export function Bold({ children, className, ...props }: BoldProps) {
  return (
    <strong
      className={cn("font-semibold text-primary", className)}
      {...props}
    >
      {children}
    </strong>
  );
}