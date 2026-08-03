/// <reference types="react/jsx-runtime" />
/** @jsxImportSource react */

"use client";

import { cn } from "@/lib/utils";

interface InlineCodeProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
}

export function InlineCode({ children, className, ...props }: InlineCodeProps) {
  return (
    <code
      className={cn(
        "relative rounded-md bg-white/5 px-1.5 py-0.5 font-mono text-[0.85em] text-primary",
        "before:content-[''] before:absolute before:inset-0 before:rounded-md before:bg-primary/10",
        className,
      )}
      {...props}
    >
      {children}
    </code>
  );
}
