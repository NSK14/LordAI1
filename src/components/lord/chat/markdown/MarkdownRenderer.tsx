/** @jsxImportSource react */

"use client";

import ReactMarkdown from "react-markdown";
import rehypeShiki from "@shikijs/rehype";
import remarkGfm from "remark-gfm";
import * as components from "./components/index"; // Import for side effects if needed, but we'll import directly below
import { 
  Blockquote, 
 
  CodeBlock, 
  Heading, 
  HorizontalRule, 
  Image, 
  InlineCode, 
  Link, 
  List,  ListItem, 
  Paragraph, 
  Table,  TableBody,  TableCell,  TableCaption,  TableHeader,  TableRow,  } from "./components/index";

const shikiHighlighter = rehypeShiki({
  themes: {
    light: "github-light",
    dark: "github-dark",
  },
  defaultColor: false,
});

export function MarkdownRenderer({ 
  children, 
  className,
  ...props 
}: { 
  children: string; 
  className?: string;
  [key: string]: any;
}) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[shikiHighlighter]]}
        components={{
          h1: (props) => <Heading level={1} {...props} />,
          h2: (props) => <Heading level={2} {...props} />,
          h3: (props) => <Heading level={3} {...props} />,
          h4: (props) => <Heading level={4} {...props} />,
          h5: (props) => <Heading level={5} {...props} />,
          h6: (props) => <Heading level={6} {...props} />,
          p: Paragraph,
          code: InlineCode,
          strong: Bold,
          b: Bold,
          em: Italic,
          i: Italic,
          blockquote: Blockquote,
          ul: (props) => <List {...props} ordered={false} />,
          ol: (props) => <List {...props} ordered={true} />,
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
        }}
        {...props}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}