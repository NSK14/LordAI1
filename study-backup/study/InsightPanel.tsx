import { motion } from "framer-motion";
import React from "react";
import type { StudyDashboardData } from "@/hooks/study/study-activity-types";

type Props = {
  mode: string;
  dashboard: { data: StudyDashboardData };
};

export function InsightPanel({ mode, dashboard }: Props) {
  const data = dashboard?.data ?? {};

  return (
    <motion.aside
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      transition={{ duration: 0.28 }}
      className="hidden lg:block"
    >
      <div className="hud-panel p-4">
        <div className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          AI Intelligence
        </div>

        {mode === "flashcards" && (
          <div>
            <div className="text-sm font-semibold">Performance</div>
            <div className="text-xs text-muted-foreground">Weak areas tracked with AI recall.</div>
            <div className="mt-3 text-[12px]">
              <div>
                Streak: <strong>{data.studyStreak}</strong>
              </div>
              <div>
                Weak topics: <strong>{data.weakAreas.slice(0, 3).join(", ") || "—"}</strong>
              </div>
            </div>
          </div>
        )}

        {mode === "tutor" && (
          <div>
            <div className="text-sm font-semibold">AI Learning</div>
            <div className="text-xs text-muted-foreground">Ready for a deep session.</div>
            <div className="mt-3 text-[12px]">
              Current mission: <strong>{data.currentMission?.title ?? "None"}</strong>
            </div>
          </div>
        )}

        {mode === "tasks" && (
          <div>
            <div className="text-sm font-semibold">Task Control</div>
            <div className="text-xs text-muted-foreground">Managed by mission priority.</div>
            <div className="mt-3 text-[12px]">
              Topics completed: <strong>{data.topicsCompleted}</strong>
            </div>
          </div>
        )}

        {mode === "test" && (
          <div>
            <div className="text-sm font-semibold">Exam Mode</div>
            <div className="text-xs text-muted-foreground">Ready for the next challenge.</div>
            <div className="mt-3 text-[12px]">
              Current subject: <strong>{data.currentMission?.subject ?? "—"}</strong>
            </div>
          </div>
        )}

        {mode === "landing" && (
          <div>
            <div className="text-sm font-semibold">Overview</div>
            <div className="text-xs text-muted-foreground">Quick stats & tips</div>
            <div className="mt-3 text-[12px]">
              Streak: <strong>{data.studyStreak ?? 0}</strong>
            </div>
          </div>
        )}
      </div>
    </motion.aside>
  );
}

export default InsightPanel;
