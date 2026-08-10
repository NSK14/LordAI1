import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

let highlighterPromise: Promise<any> | null = null;

export class ShikiHighlighter {
  private static instance: ShikiHighlighter;
  private highlighter: any = null;

  private constructor() {}

  static getInstance(): ShikiHighlighter {
    if (!ShikiHighlighter.instance) {
      ShikiHighlighter.instance = new ShikiHighlighter();
    }
    return ShikiHighlighter.instance;
  }

  async getHighlighter(): Promise<any> {
    if (this.highlighter) return this.highlighter;

    if (!highlighterPromise) {
      highlighterPromise = this.createHighlighter();
    }

    this.highlighter = await highlighterPromise;
    return this.highlighter;
  }

  private async createHighlighter(): Promise<any> {
    return createHighlighterCore({
      themes: ["github-dark"],
      langs: [
        "typescript",
        "javascript",
        "python",
        "json",
        "bash",
        "sql",
        "html",
        "css",
        "markdown",
        "yaml",
        "rust",
        "go",
        "java",
        "cpp",
        "csharp",
        "php",
        "ruby",
        "swift",
        "kotlin",
        "dart",
        "xml",
      ],
      engine: createJavaScriptRegexEngine(),
    } as any);
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
