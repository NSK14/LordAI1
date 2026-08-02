import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message = "Loading...", className }: LoadingStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-12", className)}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        className="mb-4 h-8 w-8 rounded-full border-2 border-primary/20 border-t-primary"
      />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
