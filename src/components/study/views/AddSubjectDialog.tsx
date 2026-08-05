import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { addCustomSubject } from "@/lib/learning/client";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "../../ui/dialog";

interface AddSubjectDialogProps {
  userId: string | null;
  refresh: () => void;
}

export function AddSubjectDialog({ userId, refresh }: AddSubjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!userId || !name.trim()) return;
    const subject = name.trim();
    setIsCreating(true);
    setError("");
    try {
      await addCustomSubject(userId, subject, description.trim());
      toast.success(
        `${subject} has been added to your Study workspace. You can now continue learning ${subject} with LORD.`,
      );
      setOpen(false);
      setName("");
      setDescription("");
      refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not create subject.";
      setError(message);
      toast.error(`Could not create subject: ${message}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="inline-flex items-center gap-2 rounded-lg border border-border/40 bg-background/60 px-3 py-1.5 text-sm font-medium text-foreground shadow transition hover:border-primary/50 hover:bg-accent"
        >
          <Plus className="h-4 w-4" />
          Add Subject
        </motion.button>
      </DialogTrigger>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>Create Subject</DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground">Subject name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Robotics"
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
                placeholder="What will you study here?"
                rows={3}
                className="mt-1 w-full rounded-lg border border-border/40 bg-background/60 px-3 py-2 text-sm text-foreground placeholder-muted-foreground/50 focus:border-primary/50 focus:outline-none"
                disabled={isCreating}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <motion.div
            whileHover={{ scale: !isCreating && name.trim() ? 1.02 : 1 }}
            className="mt-6"
          >
            <button
              onClick={handleCreate}
              disabled={isCreating || !name.trim() || !userId}
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow hover:bg-primary/90 disabled:opacity-50"
            >
              {isCreating ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating…
                </span>
              ) : (
                "Create Subject"
              )}
            </button>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
