/// <reference types="react/jsx-runtime" />
/** @jsxImportSource react */

"use client";

import { useState, useRef, useEffect } from "react";
import { Copy, Check, ChevronDown, ChevronUp, Copy as CopyIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  children: React.ReactNode;
  className?: string;
  language?: string;
}

export function CodeBlock({ children, className, language = "text" }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [wrapped, setWrapped] = useState(false);
  const [showLanguage, setShowLanguage] = useState(true);
  const codeRef = useRef<HTMLPreElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const copyCode = async () => {
    const code = codeRef.current?.textContent || "";
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (wrapperRef.current && codeRef.current) {
        const wrapperWidth = wrapperRef.current.offsetWidth;
        const codeWidth = codeRef.current.scrollWidth;
        setShowLanguage(codeWidth > wrapperWidth);
      }
    };
    
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const langLabel = language.toLowerCase().replace(/^language-/, "");
  const displayLang = langLabel.charAt(0).toUpperCase() + langLabel.slice(1);

  return (
    <div
      ref={wrapperRef}
      className={cn(
        "relative overflow-hidden rounded-xl border border-border/40 bg-[rgba(20,20,20,0.8)] my-4",
        className
      )}
      data-language={langLabel}
    >
      <div className="flex items-center justify-between border-b border-border/40 bg-white/5 px-4 py-2">
        <span className="font-mono text-[10px] font-medium text-foreground/60 uppercase tracking-wider">
          {displayLang}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWrapped(!wrapped)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium transition-colors",
              "hover:bg-white/10 text-foreground/60",
              wrapped && "bg-white/10 text-foreground"
            )}
            title={wrapped ? "Disable line wrap" : "Enable line wrap"}
            aria-label={wrapped ? "Disable line wrap" : "Enable line wrap"}
          >
            {wrapped ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            <span className="hidden sm:inline">Wrap</span>
          </button>
          <button
            onClick={copyCode}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium transition-colors",
              "hover:bg-white/10 text-foreground/60",
              copied && "bg-green-500/20 text-green-400"
            )}
            aria-label={copied ? "Copied!" : "Copy code"}
            title={copied ? "Copied!" : "Copy code"}
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" />
                <span className="hidden sm:inline">Copied</span>
              </>
            ) : (
              <>
                <CopyIcon className="h-3 w-3" />
                <span className="hidden sm:inline">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>
      <div
        className={cn(
          "overflow-x-auto overflow-y-hidden",
          wrapped && "whitespace-pre-wrap break-words"
        )}
      >
        <pre
          ref={codeRef}
          className={cn(
            "shiki-code-block p-4 m-0 overflow-x-auto overflow-y-hidden",
            "text-sm sm:text-base",
            "font-mono tab-size-4",
            wrapped && "whitespace-pre-wrap break-words"
          )}
          style={{ counterReset: "line" }}
        >
          {children}
        </pre>
      </div>
    </div>
  );
}