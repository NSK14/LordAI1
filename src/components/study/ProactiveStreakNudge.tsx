import { motion } from "framer-motion";
import { Flame, Calendar, Zap } from "lucide-react";
import type { StudyActivityInput } from "@/hooks/study/study-activity-types";

interface ProactiveStreakNudgeProps {
  streak: number;
  recordActivity?: (activity: StudyActivityInput) => string;
}

/**
 * Shows a "Keep your streak alive!" banner when the user has a streak
 * but hasn't studied today. Lets them quickly jump back into study.
 */
export function ProactiveStreakNudge({ streak, recordActivity }: ProactiveStreakNudgeProps) {
  if (streak === 0) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = today.toDateString();

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
      className="mb-6 rounded-3xl border border-[rgba(255,200,0,0.25)] bg-[rgba(255,200,0,0.05)] backdrop-blur-xl p-5"
    >
      <div className="flex items-start gap-4">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[rgba(255,200,0,0.12)] shadow-[0_0_20px_rgba(255,200,0,0.18)]">
          <Flame className="h-5 w-5 text-amber-300" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wider text-amber-300">
            <span>Keep your streak alive!</span>
            <span className="text-cyan-300/60">
              ({streak} day{streak > 1 ? "s" : ""} running)
            </span>
          </div>
          <p className="mt-1 text-sm text-cyan-200/60">
            You haven't studied today. Complete a quick session to keep your streak going.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <NudgeButton
              icon={<Zap className="h-4 w-4" />}
              label="Quick Quiz"
              onClick={() => {
                recordActivity?.({
                  type: "asked_lord",
                  subject: "Quick Review",
                  title: "Streak saver — quick quiz",
                  durationMinutes: 5,
                });
                window.dispatchEvent(new CustomEvent("lord-study-nudge", { detail: "test" }));
              }}
            />
            <NudgeButton
              icon={<Calendar className="h-4 w-4" />}
              label="Revision Plan"
              onClick={() => {
                recordActivity?.({
                  type: "asked_lord",
                  subject: "Streak Review",
                  title: "Streak saver — revision",
                  durationMinutes: 5,
                });
                window.dispatchEvent(new CustomEvent("lord-study-nudge", { detail: "revision" }));
              }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function NudgeButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-300 shadow-[0_0_15px_rgba(255,200,0,0.12)] transition hover:bg-amber-500/20"
    >
      {icon}
      {label}
    </motion.button>
  );
}
