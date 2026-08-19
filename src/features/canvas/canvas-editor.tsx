import { useState, useCallback, useRef, useEffect } from "react";
import { useCanvasAI } from "@/features/canvas/canvas-hooks";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  StopCircle,
  Copy,
  Download,
  RefreshCw,
  Type,
  Code2,
  FileText,
  Palette,
  Table2,
  Workflow,
  GitBranch,
  Lightbulb,
  BookOpen,
  BarChart3,
  Maximize2,
  Minimize2,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ArtifactType } from "@/lib/phase2/types";

const ARTIFACT_TYPES: { value: ArtifactType; label: string; icon: React.ReactNode }[] = [
  { value: "markdown", label: "Markdown", icon: <FileText className="h-4 w-4" /> },
  { value: "document", label: "Document", icon: <FileText className="h-4 w-4" /> },
  { value: "code", label: "Code", icon: <Code2 className="h-4 w-4" /> },
  { value: "html", label: "HTML", icon: <Code2 className="h-4 w-4" /> },
  { value: "react_component", label: "React Component", icon: <Code2 className="h-4 w-4" /> },
  { value: "table", label: "Table", icon: <Table2 className="h-4 w-4" /> },
  { value: "mermaid", label: "Mermaid", icon: <Workflow className="h-4 w-4" /> },
  { value: "flowchart", label: "Flowchart", icon: <GitBranch className="h-4 w-4" /> },
  { value: "mind_map", label: "Mind Map", icon: <Workflow className="h-4 w-4" /> },
  { value: "note", label: "Note", icon: <Lightbulb className="h-4 w-4" /> },
  { value: "study_guide", label: "Study Guide", icon: <BookOpen className="h-4 w-4" /> },
  { value: "research_report", label: "Research Report", icon: <BarChart3 className="h-4 w-4" /> },
];

interface CanvasEditorProps {
  initialContent?: string;
  artifactType?: ArtifactType;
  onSave?: (content: string, type: ArtifactType) => void;
  readOnly?: boolean;
  className?: string;
}

export function CanvasEditor({
  initialContent = "",
  artifactType = "markdown",
  onSave,
  readOnly = false,
  className,
}: CanvasEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [type, setType] = useState<ArtifactType>(artifactType);
  const [prompt, setPrompt] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { content: streamedContent, isStreaming, generate, stop } = useCanvasAI();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (streamedContent && isStreaming) {
      setContent(streamedContent);
    }
  }, [streamedContent, isStreaming]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || isStreaming) return;

    try {
      await generate({
        prompt: prompt.trim(),
        artifactType: type,
        onComplete: (full: string) => {
          setContent(full);
          onSave?.(full, type);
        },
      });
    } catch {
      toast.error("Failed to generate content");
    }
  }, [prompt, type, isStreaming, generate, onSave]);

  const handleStop = useCallback(() => {
    stop();
  }, [stop]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  }, [content]);

  const handleExport = useCallback(
    (format: "md" | "html" | "txt") => {
      const ext = format === "md" ? "md" : format === "html" ? "html" : "txt";
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `artifact.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported as ${ext.toUpperCase()}`);
    },
    [content],
  );

  const handleInlineEdit = useCallback(
    async (instruction: string) => {
      if (!content.trim() || isStreaming) return;

      try {
        await generate({
          prompt: instruction,
          artifactType: type,
          existingContent: content,
          instruction: "rewrite",
          onComplete: (full) => {
            setContent(full);
            onSave?.(full, type);
          },
        });
      } catch {
        toast.error("Failed to apply edit");
      }
    },
    [content, type, isStreaming, generate, onSave],
  );

  return (
    <motion.div
      layout
      className={cn(
        "flex flex-col h-full bg-background border border-border rounded-xl overflow-hidden",
        isFullscreen && "fixed inset-4 z-50 rounded-2xl",
        className,
      )}
    >
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2">
          <Select value={type} onValueChange={(v) => setType(v as ArtifactType)}>
            <SelectTrigger className="h-8 w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ARTIFACT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  <span className="flex items-center gap-2">
                    {t.icon}
                    {t.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="text-xs">
            {type.replace(/_/g, " ")}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopy}>
            <Copy className="h-4 w-4" />
          </Button>
          <Select onValueChange={handleExport}>
            <SelectTrigger className="h-8 w-[80px]">
              <Download className="h-4 w-4" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="md">Markdown</SelectItem>
              <SelectItem value="html">HTML</SelectItem>
              <SelectItem value="txt">Text</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            readOnly={readOnly || isStreaming}
            placeholder="Start typing or use AI to generate..."
            className={cn(
              "flex-1 resize-none border-0 rounded-none p-4 font-mono text-sm leading-relaxed",
              "focus-visible:ring-0 focus-visible:ring-offset-0",
              isStreaming && "opacity-90",
            )}
          />
        </div>

        <AnimatePresence>
          {isStreaming && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-64 border-l border-border bg-muted/10 p-3 flex flex-col gap-2"
            >
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Sparkles className="h-4 w-4 animate-pulse text-primary" />
                Generating...
              </div>
              <Separator />
              <div className="flex flex-wrap gap-1.5">
                {["Rewrite", "Expand", "Summarize", "Fix"].map((action) => (
                  <Button
                    key={action}
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => handleInlineEdit(action.toLowerCase())}
                    disabled={!content.trim()}
                  >
                    {action}
                  </Button>
                ))}
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="w-full mt-auto"
                onClick={handleStop}
              >
                <StopCircle className="h-4 w-4 mr-1.5" />
                Stop
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="px-4 py-2 border-t border-border bg-muted/10">
        <div className="flex items-center gap-2">
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask AI to generate, rewrite, or transform..."
            className="min-h-[40px] max-h-[120px] resize-none border-0 bg-transparent focus-visible:ring-0 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleGenerate();
              }
            }}
          />
          <Button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isStreaming}
            size="icon"
            className="shrink-0"
          >
            {isStreaming ? <StopCircle className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

export function CanvasToolbar({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
      <Button onClick={onNew} className="gap-1.5">
        <Sparkles className="h-4 w-4" />
        New Artifact
      </Button>
      <Separator orientation="vertical" className="h-6" />
      <span className="text-sm text-muted-foreground">AI Canvas</span>
    </div>
  );
}
