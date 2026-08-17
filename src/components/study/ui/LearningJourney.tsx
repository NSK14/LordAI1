import { motion } from "framer-motion";
import { Calendar, Trophy, Flame, Zap, BookOpen, Target, GraduationCap } from "lucide-react";
import type { JourneyEvent } from "@/lib/learning/journey";
import type { LearnerStats } from "@/lib/learning/gamification";
import type { LearningSnapshot } from "@/lib/learning/types";

interface LearningJourneyProps {
  events: JourneyEvent[];
  stats: LearnerStats | null;
  snapshot: LearningSnapshot;
  onConceptClick?: (conceptId: string) => void;
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
  learned: <BookOpen className="h-4 w-4" />,
  practiced: <Target className="h-4 w-4" />,
  mastered: <Trophy className="h-4 w-4 text-yellow-500" />,
  exam: <GraduationCap className="h-4 w-4" />,
  tutor: <GraduationCap className="h-4 w-4" />,
  flashcard: <Zap className="h-4 w-4" />,
  milestone: <Trophy className="h-4 w-4" />,
  streak: <Flame className="h-4 w-4 text-orange-500" />,
};

const EVENT_COLORS: Record<string, string> = {
  learned: "bg-blue-500/10 text-blue-500",
  practiced: "bg-green-500/10 text-green-500",
  mastered: "bg-yellow-500/10 text-yellow-600",
  exam: "bg-purple-500/10 text-purple-500",
  tutor: "bg-indigo-500/10 text-indigo-500",
  flashcard: "bg-pink-500/10 text-pink-500",
  milestone: "bg-amber-500/10 text-amber-500",
  streak: "bg-orange-500/10 text-orange-500",
};

export function LearningJourney({ events, stats, snapshot, onConceptClick }: LearningJourneyProps) {
  const groupedEvents = events.reduce(
    (groups, event) => {
      const date = new Date(event.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(event);
      return groups;
    },
    {} as Record<string, JourneyEvent[]>,
  );

  return (
    <div className="space-y-6">
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-border/60 bg-card p-4 text-center">
            <div className="text-2xl font-bold text-primary">Lvl {stats.level}</div>
            <div className="text-xs text-muted-foreground mt-1">Level</div>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-4 text-center">
            <div className="text-2xl font-bold text-orange-500">{stats.streak}</div>
            <div className="text-xs text-muted-foreground mt-1">Day Streak</div>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-4 text-center">
            <div className="text-2xl font-bold text-emerald-500">
              {stats.achievements.filter((a) => a.unlockedAt).length}
            </div>
            <div className="text-xs text-muted-foreground mt-1">Achievements</div>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-4 text-center">
            <div className="text-2xl font-bold text-violet-500">{stats.totalXp}</div>
            <div className="text-xs text-muted-foreground mt-1">Total XP</div>
          </div>
        </div>
      )}

      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-border/60" />
        <div className="space-y-6">
          {Object.entries(groupedEvents).map(([date, dayEvents], groupIndex) => (
            <motion.div
              key={date}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: groupIndex * 0.05 }}
              className="relative pl-10"
            >
              <div className="absolute left-2.5 top-1.5 h-3 w-3 rounded-full border-2 border-primary bg-background" />
              <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                {date}
              </div>
              <div className="space-y-2">
                {dayEvents.slice(0, 5).map((event, eventIndex) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: groupIndex * 0.05 + eventIndex * 0.03 }}
                    className={`flex items-start gap-3 rounded-lg border border-border/40 bg-card/50 p-3 ${event.conceptId && onConceptClick ? "cursor-pointer hover:border-primary/30" : ""}`}
                    onClick={() => event.conceptId && onConceptClick?.(event.conceptId)}
                  >
                    <div
                      className={`mt-0.5 rounded-full p-1.5 ${EVENT_COLORS[event.type] ?? "bg-muted text-muted-foreground"}`}
                    >
                      {EVENT_ICONS[event.type] ?? <Target className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {event.conceptTitle ?? event.description}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {event.description}
                      </p>
                    </div>
                    {event.xpEarned > 0 && (
                      <span className="text-xs font-medium text-violet-500 whitespace-nowrap">
                        +{event.xpEarned} XP
                      </span>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
