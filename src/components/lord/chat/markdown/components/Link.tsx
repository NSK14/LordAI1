/// <reference types="react/jsx-runtime" />
/** @jsxImportSource react */

"use client";

import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  children?: React.ReactNode;
  href: string;
}

export function Link({ children, href, className, ...props }: LinkProps) {
  const isExternal = href.startsWith("http://") || href.startsWith("https://");

  return (
    <a
      href={href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      className={cn(
        "relative inline-flex items-center text-primary underline underline-offset-2",
        "hover:text-primary/80 transition-colors",
        "after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary/30 after:scale-x-0 after:origin-bottom-right after:hover:scale-x-100 after:hover:origin-bottom-left after:transition-transform after:duration-200",
        isExternal && "pr-4",
        className,
      )}
      {...props}
    >
      {children}
      {isExternal && <ExternalLink className="w-3 h-3 ml-1 opacity-60 shrink-0" />}
    </a>
  );
}
