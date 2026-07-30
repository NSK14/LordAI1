/// <reference types="react/jsx-runtime" />
/** @jsxImportSource react */

"use client";

import { cn } from "@/lib/utils";
import { Quote } from "lucide-react";

interface BlockquoteProps extends React.HTMLAttributes<HTMLQuoteElement> {
  children: React.ReactNode;
}

export function Blockquote({ children, className, ...props }: BlockquoteProps) {
  return (
    <blockquote
      className={cn(
        "relative pl-6 border-l-2 border-primary/50 bg-primary/5 rounded-r-lg py-2 my-4",
        "before:content-[''] before:absolute before:left-2 before:top-1 before:text-2xl before:text-primary/30",
        className
      )}
      {...props}
    >
      <div className="flex items-start gap-2">
        <Quote className="w-5 h-5 text-primary/30 shrink-0 mt-0.5" />
        <div className="text-foreground/80 italic leading-relaxed">{children}</div>
      </div>
    </blockquote>
  );
}