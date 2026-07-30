import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";
import type { HighlighterGeneric } from "shiki";

let highlighterPromise: Promise<HighlighterGeneric<"html">> | null = null;

export class ShikiHighlighter {
  private static instance: ShikiHighlighter;
  private highlighter: HighlighterGeneric<"html"> | null = null;

  private constructor() {}

  static getInstance(): ShikiHighlighter {
    if (!ShikiHighlighter.instance) {
      ShikiHighlighter.instance = new ShikiHighlighter();
    }
    return ShikiHighlighter.instance;
  }

  async getHighlighter(): Promise<HighlighterGeneric<"html">> {
    if (this.highlighter) return this.highlighter;

    if (!highlighterPromise) {
      highlighterPromise = this.createHighlighter();
    }

    this.highlighter = await highlighterPromise;
    return this.highlighter;
  }

  private async createHighlighter(): Promise<HighlighterGeneric<"html">> {
    if (typeof window === "undefined") {
      return createHighlighterCore({
        themes: [import("shiki/themes/github-dark.mjs")],
        langs: [
          import("shiki/langs/typescript.mjs"),
          import("shiki/langs/javascript.mjs"),
          import("shiki/langs/python.mjs"),
          import("shiki/langs/json.mjs"),
          import("shiki/langs/bash.mjs"),
          import("shiki/langs/sql.mjs"),
          import("shiki/langs/html.mjs"),
          import("shiki/langs/css.mjs"),
          import("shiki/langs/markdown.mjs"),
          import("shiki/langs/yaml.mjs"),
          import("shiki/langs/rust.mjs"),
          import("shiki/langs/go.mjs"),
          import("shiki/langs/java.mjs"),
          import("shiki/langs/cpp.mjs"),
          import("shiki/langs/csharp.mjs"),
          import("shiki/langs/php.mjs"),
          import("shiki/langs/ruby.mjs"),
          import("shiki/langs/swift.mjs"),
          import("shiki/langs/kotlin.mjs"),
          import("shiki/langs/dart.mjs"),
          import("shiki/langs/xml.mjs"),
        ],
        engine: createOnigurumaEngine(
          import("shiki/wasm")
        ),
      });
    }

    return createHighlighterCore({
      themes: [import("shiki/themes/github-dark.mjs")],
      langs: [
        import("shiki/langs/typescript.mjs"),
        import("shiki/langs/javascript.mjs"),
        import("shiki/langs/python.mjs"),
        import("shiki/langs/json.mjs"),
        import("shiki/langs/bash.mjs"),
        import("shiki/langs/sql.mjs"),
        import("shiki/langs/html.mjs"),
        import("shiki/langs/css.mjs"),
        import("shiki/langs/markdown.mjs"),
        import("shiki/langs/yaml.mjs"),
        import("shiki/langs/rust.mjs"),
        import("shiki/langs/go.mjs"),
        import("shiki/langs/java.mjs"),
        import("shiki/langs/cpp.mjs"),
        import("shiki/langs/csharp.mjs"),
        import("shiki/langs/php.mjs"),
        import("shiki/langs/ruby.mjs"),
        "shiki/langs/swift.mjs",
        "shiki/langs/kotlin.mjs",
        "shiki/langs/dart.mjs",
        "shiki/langs/xml.mjs",
      ],
      engine: createJavaScriptRegexEngine(),
    });
  }

  rehypePlugin() {
    return async (tree: any) => {
      const highlighter = await this.getHighlighter();
      
      const visit = (node: any) => {
        if (node.type === "element" && node.tagName === "pre") {
          const codeNode = node.children?.[0];
          if (codeNode?.type === "element" && codeNode.tagName === "code") {
            const lang = codeNode.properties?.className?.[0]?.replace("language-", "") || "text";
            const code = codeNode.children?.[0]?.value || "";
            
            try {
              const highlighted = highlighter.codeToHtml(code, {
                lang: lang as any,
                theme: "github-dark",
              });
              
              node.tagName = "div";
              node.properties = {
                ...node.properties,
                className: [
                  "shiki-code-block",
                  "relative",
                  "overflow-hidden",
                  "rounded-xl",
                  "border",
                  "border-border/40",
                  "bg-[rgba(20,20,20,0.8)]",
                  "my-4",
                  "overflow-hidden",
                ],
                "data-language": lang,
              };
              node.children = [{ type: "raw", value: highlighted }];
            } catch (e) {
              console.warn("Shiki highlighting failed:", e);
            }
          }
        }
        
        if (node.children) {
          node.children.forEach(visit);
        }
      };
      
      visit(tree);
    };
  }
}

let rehypePluginPromise: Promise<any> | null = null;

export async function getRehypePlugin() {
  const highlighter = ShikiHighlighter.getInstance();
  
  if (!rehypePluginPromise) {
    rehypePluginPromise = (async () => {
      await highlighter.getHighlighter();
      return highlighter.rehypePlugin();
    })();
  }
  
  return rehypePluginPromise;
}

export const shikiRehypePlugin = async () => {
  const plugin = await getRehypePlugin();
  return plugin;
};