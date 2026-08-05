import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { completeStudentOnboarding } from "@/lib/learning/client";

interface ClassSelectorProps {
  userId: string | null;
  initialClass?: string | null;
  onSaved?: () => void;
}

const CLASSES = Array.from({ length: 12 }, (_, i) => i + 1);

export function ClassSelector({ userId, initialClass, onSaved }: ClassSelectorProps) {
  const [selected, setSelected] = useState<number | null>(
    initialClass ? Number.parseInt(initialClass, 10) : null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!selected || !userId) return;
    setIsSaving(true);
    setError("");
    try {
      await completeStudentOnboarding(userId, selected);
      toast.success(`Class ${selected} saved. Your Study workspace is ready.`);
      onSaved?.();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong.";
      setError(message);
      toast.error(`Could not save class: ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const canSave = !!selected && !!userId && !isSaving;

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h2 className="font-display text-xl font-semibold text-foreground">
          What class are you currently studying?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This sets your curriculum level across Study. You can change it later.
        </p>
      </div>

      <div className="grid w-full max-w-lg grid-cols-3 gap-3 sm:grid-cols-4">
        {CLASSES.map((cls) => (
          <motion.button
            key={cls}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setSelected(cls)}
            className={cn(
              "flex h-12 w-full items-center justify-center rounded-xl border text-sm font-medium transition-all",
              selected === cls
                ? "border-primary bg-primary/15 text-primary shadow-[0_0_12px_rgba(66,133,244,0.25)]"
                : "border-border/40 bg-card/40 text-muted-foreground hover:border-border/70 hover:text-foreground",
            )}
          >
            Class {cls}
          </motion.button>
        ))}
      </div>

      {error && <p className="text-center text-sm text-destructive">{error}</p>}

      <motion.div whileHover={{ scale: canSave ? 1.02 : 1 }}>
        <Button onClick={handleSave} disabled={!canSave}>
          {isSaving ? "Saving…" : "Continue to Study"}
        </Button>
      </motion.div>
    </div>
  );
}
