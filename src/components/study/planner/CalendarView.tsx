import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LearningPlanTask } from "@/lib/learning/types";

interface CalendarViewProps {
  tasks: LearningPlanTask[];
  dailyTarget: number;
  onTaskClick: (task: LearningPlanTask) => void;
  onDateClick?: (date: string) => void;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function CalendarView({ tasks, dailyTarget, onTaskClick, onDateClick }: CalendarViewProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const taskMap = useMemo(() => {
    const map = new Map<string, LearningPlanTask[]>();
    for (const t of tasks) {
      const day = new Date(t.due_at).toISOString().slice(0, 10);
      const list = map.get(day) ?? [];
      list.push(t);
      map.set(day, list);
    }
    return map;
  }, [tasks]);

  const firstDay = new Date(viewYear, viewMonth, 1);
  const startDayOfWeek = firstDay.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const cells: Array<{
    date: Date;
    dateStr: string;
    isCurrentMonth: boolean;
    dayTasks: LearningPlanTask[];
  }> = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    const d = new Date(viewYear, viewMonth, i - startDayOfWeek + 1);
    cells.push({
      date: d,
      dateStr: d.toISOString().slice(0, 10),
      isCurrentMonth: false,
      dayTasks: taskMap.get(d.toISOString().slice(0, 10)) ?? [],
    });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(viewYear, viewMonth, day);
    cells.push({
      date: d,
      dateStr: d.toISOString().slice(0, 10),
      isCurrentMonth: true,
      dayTasks: taskMap.get(d.toISOString().slice(0, 10)) ?? [],
    });
  }
  while (cells.length % 7 !== 0) {
    const idx = cells.length;
    const d = new Date(viewYear, viewMonth, idx - startDayOfWeek + 1);
    cells.push({
      date: d,
      dateStr: d.toISOString().slice(0, 10),
      isCurrentMonth: false,
      dayTasks: taskMap.get(d.toISOString().slice(0, 10)) ?? [],
    });
  }

  const todayStr = today.toISOString().slice(0, 10);

  return (
    <div className="rounded-xl border border-border/30 bg-card/30 p-4">
      <div className="mb-4 flex items-center justify-between">
        <button onClick={prevMonth} className="rounded-lg p-1.5 hover:bg-muted/40">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h3 className="font-display text-lg font-semibold">
          {MONTHS[viewMonth]} {viewYear}
        </h3>
        <button onClick={nextMonth} className="rounded-lg p-1.5 hover:bg-muted/40">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1">
        {DAYS.map((d) => (
          <div key={d} className="py-1 text-center text-xs text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          const totalMinutes = cell.dayTasks.reduce(
            (sum, t) => sum + (t.estimated_minutes ?? 0),
            0,
          );
          const overloaded = totalMinutes > dailyTarget;
          const isToday = cell.dateStr === todayStr;

          return (
            <motion.button
              key={i}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onDateClick?.(cell.dateStr)}
              className={cn(
                "flex min-h-[60px] flex-col rounded-lg border p-1.5 text-left transition",
                cell.isCurrentMonth
                  ? "border-border/30 bg-background/40"
                  : "border-border/10 bg-muted/10 opacity-40",
                isToday && "ring-1 ring-primary/40",
                overloaded && "border-amber-500/30",
              )}
            >
              <span
                className={cn(
                  "mb-1 text-xs font-medium",
                  isToday &&
                    "flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground",
                )}
              >
                {cell.date.getDate()}
              </span>
              {cell.dayTasks.length > 0 && (
                <div className="mt-auto space-y-0.5">
                  {cell.dayTasks.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onTaskClick(task);
                      }}
                      className={cn(
                        "truncate rounded px-1 py-0.5 text-[10px]",
                        task.status === "completed"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : task.priority === "high"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-primary/10 text-primary",
                      )}
                    >
                      {task.title}
                    </div>
                  ))}
                  {cell.dayTasks.length > 3 && (
                    <span className="px-1 text-[10px] text-muted-foreground">
                      +{cell.dayTasks.length - 3} more
                    </span>
                  )}
                </div>
              )}
              {overloaded && (
                <div className="mt-auto">
                  <AlertTriangle className="h-3 w-3 text-amber-400" />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
