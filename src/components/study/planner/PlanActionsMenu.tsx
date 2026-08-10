import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Edit3,
  Archive,
  Pause,
  Play,
  Copy,
  Trash2,
  MoreVertical,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import type { LearningPlan } from "@/lib/learning/types";

interface PlanActionsMenuProps {
  plan: LearningPlan;
  onEdit: () => void;
  onArchive: () => void;
  onPause: () => void;
  onResume: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onAskLord: () => void;
  onOptimize: () => void;
}

export function PlanActionsMenu({
  plan,
  onEdit,
  onArchive,
  onPause,
  onResume,
  onDuplicate,
  onDelete,
  onAskLord,
  onOptimize,
}: PlanActionsMenuProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const isPaused = plan.status === "paused";
  const isArchived = plan.status === "archived";
  const isCompleted = plan.status === "completed";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={onEdit}>
            <Edit3 className="mr-2 h-4 w-4" />
            Edit Plan
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onAskLord}>
            <Sparkles className="mr-2 h-4 w-4" />
            Ask LORD
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onOptimize}>
            <TrendingUp className="mr-2 h-4 w-4" />
            Optimize with LORD
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {!isArchived && !isCompleted && (
            <>
              {isPaused ? (
                <DropdownMenuItem onClick={onResume}>
                  <Play className="mr-2 h-4 w-4" />
                  Resume
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={onPause}>
                  <Pause className="mr-2 h-4 w-4" />
                  Pause
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={onArchive}>
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setShowDeleteConfirm(true)} className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{plan.title}" and all its tasks. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowDeleteConfirm(false);
                onDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
