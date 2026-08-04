import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { addConceptToPlan } from "@/lib/learning/client";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "../../ui/dialog";
import type { LearningConcept } from "../types";

interface AddConceptDialogProps {
  userId: string | null;
  concepts: LearningConcept[];
  addedConceptIds: string[];
  refresh: () => void;
}

export function AddConceptDialog({
  userId,
  concepts,
  addedConceptIds,
  refresh,
}: AddConceptDialogProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [addingIds, setAddingIds] = useState<Set<string>>(new Set());
  const [locallyAdded, setLocallyAdded] = useState<string[]>([]);

  const addedSet = useMemo(
    () => new Set([...addedConceptIds, ...locallyAdded]),
    [addedConceptIds, locallyAdded],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return concepts;
    return concepts.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.standard_code.toLowerCase().includes(q) ||
        (c.subject?.toLowerCase().includes(q) ?? false) ||
        (c.keywords?.some((k) => k.toLowerCase().includes(q)) ?? false),
    );
  }, [concepts, query]);

  const handleAdd = async (concept: LearningConcept) => {
    if (!userId || addedSet.has(concept.id) || addingIds.has(concept.id)) return;
    setAddingIds((s) => new Set(s).add(concept.id));
    try {
      await addConceptToPlan(userId, { id: concept.id, title: concept.title });
      setLocallyAdded((prev) => [...prev, concept.id]);
      toast.success(`${concept.title} added to your study plan.`);
      refresh();
    } catch {
      toast.error("Could not add concept to your study plan.");
    } finally {
      setAddingIds((s) => {
        const copy = new Set(s);
        copy.delete(concept.id);
        return copy;
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground shadow transition hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Concept
        </motion.button>
      </DialogTrigger>
      <DialogContent className="max-w-lg p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Add Concept to Study Plan</DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-4">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
            <input
              type="text"
              placeholder="Search concepts, codes, or keywords..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-lg border border-border/40 bg-background/60 pl-10 pr-4 py-2 text-sm text-foreground placeholder-muted-foreground/50 focus:border-primary/50 focus:outline-none"
            />
          </div>
          <p className="mb-2 text-xs text-muted-foreground">
            {addedSet.size} of {concepts.length} concepts added
          </p>
          <AnimatePresence>
            {filtered.length === 0 ? (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-6 text-center text-sm text-muted-foreground"
              >
                No concepts match your search.
              </motion.p>
            ) : (
              <motion.div
                className="space-y-1 max-h-72 overflow-y-auto"
                initial="hide"
                animate="show"
                variants={{ show: { transition: { staggerChildren: 0.03 } } }}
              >
                {filtered.map((concept) => {
                  const alreadyAdded = addedSet.has(concept.id);
                  const isAdding = addingIds.has(concept.id);
                  return (
                    <motion.div
                      key={concept.id}
                      variants={{ show: { opacity: 1, y: 0 } }}
                      className="flex items-center justify-between rounded-lg border border-border/40 bg-card/50 px-3 py-2"
                    >
                      <div className="flex-1 truncate">
                        <p className="text-sm font-medium text-foreground truncate">
                          {concept.title}
                        </p>
                        <p className="text-xs text-muted-foreground/70 truncate">
                          {concept.subject} · {concept.standard_code}
                        </p>
                      </div>
                      {isAdding ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <motion.button
                          whileHover={{ scale: alreadyAdded ? 1 : 1.05 }}
                          whileTap={{ scale: alreadyAdded ? 1 : 0.95 }}
                          onClick={() => handleAdd(concept)}
                          disabled={alreadyAdded}
                          className={cn(
                            "inline-flex items-center justify-center rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                            alreadyAdded
                              ? "cursor-default bg-muted/30 text-muted-foreground"
                              : "bg-primary/10 text-primary hover:bg-primary/20",
                          )}
                        >
                          {alreadyAdded ? (
                            <Check className="h-3.5 w-3.5" />
                          ) : (
                            <Plus className="h-3.5 w-3.5" />
                          )}
                        </motion.button>
                      )}
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}
