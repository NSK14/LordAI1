/** @jsxImportSource react */

"use client";

import ReactMarkdown from "react-markdown";
import rehypeShiki from "@shikijs/rehype";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef } from "react";

type RehypePlugin = (tree: any) => any;
import {
  Blockquote,
  Bold,
  Heading,
  HorizontalRule,
  Image,
  InlineCode,
  Italic,
  Link,
  List,
  ListItem,
  Paragraph,
  Table,
  TableBody,
  TableCell,
  TableCaption,
  TableHead,
  TableHeader,
  TableRow,
} from "./components/index";

function safeRehypeShiki(): RehypePlugin {
  const shiki = (
    rehypeShiki as unknown as (options: {
      themes: { light: string; dark: string };
      defaultColor: boolean;
    }) => RehypePlugin
  )({
    themes: {
      light: "github-light",
      dark: "github-dark",
    },
    defaultColor: false,
  });

  return function safeShiki(tree: any) {
    try {
      if (!tree || !tree.children || !Array.isArray(tree.children)) {
        return tree;
      }
      sanitizeTree(tree);
      return shiki(tree);
    } catch (error) {
      console.error("Shiki highlight error:", error);
      return tree;
    }
  };
}

function sanitizeTree(node: any): void {
  if (!node || typeof node !== "object") return;

  if (Array.isArray(node.children)) {
    node.children = node.children.filter((child: any) => child && typeof child === "object");
    for (const child of node.children) {
      sanitizeTree(child);
    }
  }
}

const shikiHighlighter = safeRehypeShiki();

export function MarkdownRenderer({
  children,
  className,
  streaming,
  ...props
}: {
  children: string;
  className?: string;
  streaming?: boolean;
  [key: string]: unknown;
}) {
  const safeChildren = typeof children === "string" ? children : "";

  return (
    <div className={cn(className, streaming && "markdown-streaming")}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[shikiHighlighter]] as any}
        components={
          {
            h1: (props: ComponentPropsWithoutRef<"h1">) => <Heading level={1} {...props} />,
            h2: (props: ComponentPropsWithoutRef<"h2">) => <Heading level={2} {...props} />,
            h3: (props: ComponentPropsWithoutRef<"h3">) => <Heading level={3} {...props} />,
            h4: (props: ComponentPropsWithoutRef<"h4">) => <Heading level={4} {...props} />,
            h5: (props: ComponentPropsWithoutRef<"h5">) => <Heading level={5} {...props} />,
            h6: (props: ComponentPropsWithoutRef<"h6">) => <Heading level={6} {...props} />,
            p: Paragraph,
            code: InlineCode,
            strong: Bold,
            b: Bold,
            em: Italic,
            i: Italic,
            blockquote: Blockquote,
            ul: (props: ComponentPropsWithoutRef<"ul">) => <List {...props} ordered={false} />,
            ol: (props: ComponentPropsWithoutRef<"ol">) => <List {...props} ordered={true} />,
            li: ListItem,
            a: Link,
            hr: HorizontalRule,
            table: Table,
            thead: TableHeader,
            tbody: TableBody,
            tr: TableRow,
            th: TableHead,
            td: TableCell,
            caption: TableCaption,
          } as any
        }
        {...props}
      >
        {safeChildren}
      </ReactMarkdown>
    </div>
  );
}
