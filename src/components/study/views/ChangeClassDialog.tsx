import { useState } from "react";
import { Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogTrigger, DialogContent } from "../../ui/dialog";
import { ClassSelector } from "./ClassSelector";

interface ChangeClassDialogProps {
  userId: string | null;
  currentClass?: string | null;
  onSaved?: () => void;
}

export function ChangeClassDialog({ userId, currentClass, onSaved }: ChangeClassDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border border-border/40 bg-background/60 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground",
          )}
          aria-label="Change class"
          title="Change class"
        >
          <Settings className="h-3.5 w-3.5" />
          {currentClass ? `Class ${currentClass}` : "Set class"}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md p-6">
        <ClassSelector
          userId={userId}
          initialClass={currentClass}
          onSaved={() => {
            setOpen(false);
            onSaved?.();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
