import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  ChevronDown,
  ChevronUp,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { AIProposedChange, PlanOptimizationResult } from "@/lib/learning/types";

interface LordPlanAssistantProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planTitle: string;
  onApplyChanges: (changes: AIProposedChange[]) => void;
  onOptimize: () => Promise<PlanOptimizationResult>;
  onSuggest: (
    message: string,
  ) => Promise<{ summary: string; changes: AIProposedChange[]; smartSuggestions: string[] }>;
}

const SUGGESTION_PRESETS = [
  {
    label: "Make this plan easier",
    message: "Make this plan easier by reducing difficulty and spreading tasks.",
  },
  {
    label: "Make this plan more effective",
    message: "Optimize this plan for better learning outcomes and retention.",
  },
  {
    label: "Spread tasks across more days",
    message: "Spread the tasks across more days to reduce daily workload.",
  },
  {
    label: "Prepare me for an exam",
    message: "Add more review and practice sessions to prepare for the exam.",
  },
  {
    label: "Prioritize weak subjects",
    message: "Prioritize tasks for concepts where my mastery is lowest.",
  },
  {
    label: "Create a revision schedule",
    message: "Create a revision schedule with spaced repetition.",
  },
  {
    label: "Reduce daily workload",
    message: "Reduce the daily workload to make the plan more manageable.",
  },
  {
    label: "Add practice sessions",
    message: "Add more practice sessions to strengthen weak areas.",
  },
  {
    label: "Optimize my entire plan",
    message: "Analyze and optimize my entire plan for the best results.",
  },
];

export function LordPlanAssistant({
  open,
  onOpenChange,
  planTitle,
  onApplyChanges,
  onOptimize,
  onSuggest,
}: LordPlanAssistantProps) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    summary: string;
    changes: AIProposedChange[];
    smartSuggestions: string[];
  } | null>(null);
  const [applied, setApplied] = useState(false);

  const handlePreset = async (presetMessage: string) => {
    setLoading(true);
    setResult(null);
    setApplied(false);
    try {
      const res = await onSuggest(presetMessage);
      setResult(res);
    } catch {
      setResult({
        summary: "Something went wrong. Please try again.",
        changes: [],
        smartSuggestions: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    const userMessage = message.trim();
    setMessage("");
    setLoading(true);
    setResult(null);
    setApplied(false);
    try {
      const res = await onSuggest(userMessage);
      setResult(res);
    } catch {
      setResult({
        summary: "Something went wrong. Please try again.",
        changes: [],
        smartSuggestions: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOptimize = async () => {
    setLoading(true);
    setResult(null);
    setApplied(false);
    try {
      const res = await onOptimize();
      setResult({
        summary: res.summary,
        changes: res.changes,
        smartSuggestions: res.recommendations ?? [],
      });
    } catch {
      setResult({
        summary: "Something went wrong. Please try again.",
        changes: [],
        smartSuggestions: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (result?.changes) {
      onApplyChanges(result.changes);
      setApplied(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            LORD Plan Assistant
          </DialogTitle>
          <DialogDescription>
            Ask LORD to help optimize and improve your "{planTitle}" plan.
          </DialogDescription>
        </DialogHeader>

        {!result && !loading && (
          <div className="py-4">
            <p className="mb-3 text-sm text-muted-foreground">What would you like to change?</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SUGGESTION_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handlePreset(preset.message)}
                  className="flex items-center justify-between rounded-xl border border-border/30 bg-card/40 p-3 text-left text-sm transition hover:border-primary/40 hover:bg-primary/5"
                >
                  <span className="text-foreground">{preset.label}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
            <button
              onClick={handleOptimize}
              className="mt-3 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3 text-sm text-primary transition hover:bg-primary/10"
            >
              <TrendingUp className="h-4 w-4" />
              Optimize with LORD
            </button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">LORD is analyzing your plan...</p>
          </div>
        )}

        {result && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 py-4"
          >
            <div className="rounded-xl border border-border/30 bg-card/30 p-4">
              <p className="text-sm text-foreground">{result.summary}</p>
            </div>

            {result.changes.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-foreground">
                  Changes LORD would make:
                </h4>
                <div className="space-y-2">
                  {result.changes.map((change, i) => {
                    const c = change as AIProposedChange;
                    return (
                      <div
                        key={i}
                        className="flex items-start gap-3 rounded-lg border border-border/20 bg-muted/20 p-3"
                      >
                        <div className="mt-0.5">
                          {c.action === "delete" ? (
                            <AlertTriangle className="h-4 w-4 text-red-400" />
                          ) : (
                            <ArrowRight className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm text-foreground">{c.summary}</p>
                          {c.from !== undefined &&
                            c.from !== null &&
                            c.to !== undefined &&
                            c.to !== null && (
                              <p className="text-xs text-muted-foreground">
                                {String(c.from)} → {String(c.to)}
                              </p>
                            )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {result.smartSuggestions.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-foreground">Suggestions:</h4>
                <div className="space-y-1.5">
                  {result.smartSuggestions.map((suggestion, i) => (
                    <p key={i} className="text-sm text-muted-foreground">
                      • {suggestion}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setResult(null)}>
                Back
              </Button>
              {result.changes.length > 0 && !applied && (
                <Button onClick={handleApply}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Apply Changes
                </Button>
              )}
              {applied && (
                <Button disabled variant="secondary">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Changes Applied
                </Button>
              )}
            </div>
          </motion.div>
        )}

        <div className="flex items-center gap-2 border-t border-border/30 pt-4">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask LORD anything about your plan..."
            rows={1}
            className="min-h-[40px] resize-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            onClick={handleSend}
            disabled={loading || !message.trim()}
            size="icon"
            className="h-10 w-10 shrink-0"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
