/// <reference types="react/jsx-runtime" />
/** @jsxImportSource react */

"use client";

import { cn } from "@/lib/utils";

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt?: string;
}

export function Image({ src, alt, className, ...props }: ImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      className={cn("rounded-lg border border-border/20 max-w-full h-auto", className)}
      {...props}
    />
  );
}
