import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { addCustomSubject, createCustomConcept } from "@/lib/learning/client";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "../../ui/dialog";
import type { LearningConcept } from "../types";

interface AddConceptDialogProps {
  userId: string | null;
  subjects: string[];
  concepts: LearningConcept[];
  classNumber?: string | null;
  refresh: () => void;
  onAdded: (conceptId: string) => void;
}

export function AddConceptDialog({
  userId,
  subjects,
  concepts,
  classNumber,
  refresh,
  onAdded,
}: AddConceptDialogProps) {
  const [open, setOpen] = useState(false);
  const [subjectMode, setSubjectMode] = useState<"existing" | "new">("existing");
  const [subject, setSubject] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const chosenSubject = subjectMode === "new" ? newSubject.trim() : subject;

  const isDuplicate = useMemo(() => {
    if (!chosenSubject || !name.trim()) return false;
    return concepts.some(
      (c) =>
        c.subject.toLowerCase() === chosenSubject.toLowerCase() &&
        c.title.toLowerCase() === name.trim().toLowerCase(),
    );
  }, [concepts, chosenSubject, name]);

  const handleAdd = async () => {
    if (!userId || !chosenSubject || !name.trim()) return;
    if (isDuplicate || isCreating) return;

    setIsCreating(true);
    setError("");
    try {
      if (subjectMode === "new") {
        await addCustomSubject(userId, chosenSubject);
      }

      const concept = await createCustomConcept(userId, {
        subject: chosenSubject,
        title: name.trim(),
        description: description.trim(),
        class: classNumber,
      });

      toast.success(
        `${concept.title} has been added to your Study workspace. You can now study ${concept.title} with LORD.`,
      );
      setOpen(false);
      setSubject("");
      setNewSubject("");
      setName("");
      setDescription("");
      setSubjectMode("existing");
      refresh();
      onAdded(concept.id);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not create concept.";
      setError(message);
      toast.error(`Could not create concept: ${message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const canSubmit = !!userId && !!chosenSubject && !!name.trim() && !isDuplicate && !isCreating;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="inline-flex items-center gap-2 rounded-lg border border-border/40 bg-background/60 px-3 py-1.5 text-sm font-medium text-foreground shadow transition hover:border-primary/50 hover:bg-accent"
        >
          <Plus className="h-4 w-4" />
          Add Concept
        </motion.button>
      </DialogTrigger>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Add Concept</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Add a concept to your curriculum. It starts at 0% mastery until you study or practice
            it.
          </p>
        </DialogHeader>
        <div className="px-6 pb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground">Subject</label>
              <div className="mt-1 flex gap-2">
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="radio"
                    name="subjectMode"
                    checked={subjectMode === "existing"}
                    onChange={() => setSubjectMode("existing")}
                  />{" "}
                  Existing
                </label>
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="radio"
                    name="subjectMode"
                    checked={subjectMode === "new"}
                    onChange={() => setSubjectMode("new")}
                  />{" "}
                  New
                </label>
              </div>
              {subjectMode === "existing" ? (
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-border/40 bg-background/60 px-3 py-2 text-sm text-foreground focus:border-primary/50 focus:outline-none"
                  disabled={isCreating}
                >
                  <option value="" disabled>
                    Select a subject
                  </option>
                  {subjects.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="New subject name"
                  className="mt-2 w-full rounded-lg border border-border/40 bg-background/60 px-3 py-2 text-sm text-foreground placeholder-muted-foreground/50 focus:border-primary/50 focus:outline-none"
                  disabled={isCreating}
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground">Concept name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Human Eye"
                className="mt-1 w-full rounded-lg border border-border/40 bg-background/60 px-3 py-2 text-sm text-foreground placeholder-muted-foreground/50 focus:border-primary/50 focus:outline-none"
                disabled={isCreating}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter what you want to learn…"
                rows={3}
                className="mt-1 w-full rounded-lg border border-border/40 bg-background/60 px-3 py-2 text-sm text-foreground placeholder-muted-foreground/50 focus:border-primary/50 focus:outline-none"
                disabled={isCreating}
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {isDuplicate && (
              <p className="text-sm text-amber-400">This concept already exists in that subject.</p>
            )}
          </div>

          <motion.div whileHover={{ scale: canSubmit ? 1.02 : 1 }} className="mt-6">
            <button
              onClick={handleAdd}
              disabled={!canSubmit}
              className={cn(
                "w-full rounded-lg px-4 py-2 text-sm font-semibold text-primary-foreground shadow transition",
                canSubmit ? "bg-primary hover:bg-primary/90" : "cursor-not-allowed bg-muted/30",
              )}
            >
              {isCreating ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Adding…
                </span>
              ) : (
                "Add Concept"
              )}
            </button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
