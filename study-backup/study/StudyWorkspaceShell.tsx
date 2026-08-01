import { motion } from "framer-motion";
import React from "react";

const ACCENT_STYLES: Record<string, string> = {
  flashcards: "from-cyan-400 to-cyan-200",
  tutor: "from-violet-400 to-fuchsia-400",
  tasks: "from-amber-400 to-orange-400",
  test: "from-rose-400 to-red-400",
  notes: "from-emerald-400 to-teal-300",
  plan: "from-sky-400 to-blue-300",
  landing: "from-cyan-400 to-slate-400",
};

type Props = {
  mode: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

export function StudyWorkspaceShell({ mode, title, subtitle, children }: Props) {
  const accent = ACCENT_STYLES[mode] ?? ACCENT_STYLES.landing;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10, scale: 0.997 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.997 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className="hud-panel relative overflow-hidden p-5"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br opacity-5 blur-3xl" />
      <div className="pointer-events-none absolute right-4 top-4 h-24 w-24 rounded-full bg-white/5 shadow-[0_0_80px_rgba(255,255,255,0.08)]" />

      <div className="relative z-10 mb-6 flex flex-col gap-2">
        <div className="flex items-center gap-3 text-xs uppercase tracking-[0.35em] text-muted-foreground">
          <span className="grid h-8 w-8 place-items-center rounded-2xl bg-white/5 text-cyan-200 shadow-[0_0_20px_rgba(0,255,255,0.12)]">
            ⚡
          </span>
          <span>{title}</span>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-white">{subtitle}</h2>
            <p className="max-w-2xl text-sm text-muted-foreground">
              A premium AI workspace custom built for {title.toLowerCase()}.
            </p>
          </div>
          <div
            className={`rounded-3xl bg-gradient-to-r ${accent} px-4 py-2 text-sm font-semibold text-white/95 shadow-[0_0_30px_rgba(0,255,255,0.18)]`}
          >
            Workspace Active
          </div>
        </div>
      </div>

      <div className="relative z-10">{children}</div>
    </motion.section>
  );
}

export default StudyWorkspaceShell;
