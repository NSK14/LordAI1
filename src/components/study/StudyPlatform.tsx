import type { ReactNode } from "react";
import { useSearch, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, useCallback } from "react";
import { AppShell } from "@/components/lord/AppShell";
import { useCurrentUser } from "@/hooks/use-current-user";
import { getLearningSnapshot } from "@/lib/learning/client";
import { detectTopic, generateDailyMissions, generateRecommendations } from "@/lib/learning/brain";
import { StudyTopNav } from "./StudyTopNav";
import { DashboardView } from "./views/DashboardView";
import { ConceptBrowser } from "./views/ConceptBrowser";
import { ConceptDetail } from "./views/ConceptDetail";
import { PracticeView } from "./views/PracticeView";
import { TutorView } from "./views/TutorView";
import { FlashcardStudy } from "./views/FlashcardStudy";
import { TestCenter } from "./views/TestCenter";
import { PlannerView } from "./views/PlannerView";
import { ProgressView } from "./views/ProgressView";
import { StudyOnboarding } from "./views/StudyOnboarding";
import { LoadingState } from "./ui/LoadingState";
import type { LearningSnapshot, StudyView } from "./types";

const AI_ENTRY_VIEW = "ai-entry";

interface AIStudyEntryProps {
  snapshot: LearningSnapshot;
  userId: string | null;
  onSubmit: (message: string) => void;
  onNavigate: (view: StudyView) => void;
  onStartPractice: (conceptId?: string) => void;
  onStartTutor: (conceptId?: string) => void;
  refresh: () => void;
}

function AIStudyEntry({
  snapshot,
  userId,
  onSubmit,
  onNavigate,
  onStartPractice,
  onStartTutor,
  refresh,
}: AIStudyEntryProps) {
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (input.trim()) {
        onSubmit(input.trim());
        setInput("");
      }
    },
    [input, onSubmit],
  );

  const handleSuggestion = useCallback(
    (suggestion: string) => {
      onSubmit(suggestion);
    },
    [onSubmit],
  );

  const quickActions = [
    { label: "Teach me physics", action: () => handleSuggestion("Teach me physics") },
    { label: "I have physics tomorrow", action: () => handleSuggestion("I have physics tomorrow") },
    { label: "Prepare me for JEE", action: () => handleSuggestion("Prepare me for JEE") },
    {
      label: "I only have 2 hours",
      action: () => handleSuggestion("I only have 2 hours to study"),
    },
    {
      label: "I don't understand integration",
      action: () => handleSuggestion("I don't understand integration"),
    },
    { label: "Review my weak topics", action: () => handleSuggestion("Review my weak topics") },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">What are you studying today?</h1>
          <p className="text-lg text-muted-foreground">
            Tell LORD what you need, and I'll create the perfect study session for you.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="I have physics tomorrow. Help me prepare."
            className="w-full rounded-xl border border-input bg-background px-6 py-4 text-lg shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Start
          </button>
        </form>

        <div className="flex flex-wrap gap-2">
          {quickActions.map(({ label, action }) => (
            <button
              key={label}
              onClick={action}
              className="rounded-full border border-input bg-muted/50 px-4 py-2 text-sm hover:bg-muted transition-colors"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Or pick a mode</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { view: "tutor" as StudyView, label: "AI Tutor", desc: "Ask anything", icon: "💬" },
              {
                view: "practice" as StudyView,
                label: "Practice",
                desc: "Adaptive questions",
                icon: "🎯",
              },
              {
                view: "flashcards" as StudyView,
                label: "Flashcards",
                desc: "Spaced repetition",
                icon: "🧠",
              },
              { view: "exams" as StudyView, label: "Test Center", desc: "Mock exams", icon: "📝" },
            ].map(({ view, label, desc, icon }) => (
              <button
                key={view}
                onClick={() => onNavigate(view)}
                className="flex items-center gap-3 rounded-xl border border-input bg-card p-4 text-left hover:bg-muted/50 transition-colors"
              >
                <span className="text-2xl">{icon}</span>
                <div>
                  <div className="font-medium">{label}</div>
                  <div className="text-sm text-muted-foreground">{desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function StudyPlatform() {
  const { view = "dashboard", concept: conceptId } = useSearch({
    from: "/_authenticated/study",
  }) as { view?: StudyView | typeof AI_ENTRY_VIEW; concept?: string };

  const { user } = useCurrentUser();
  const userId = user?.id ?? null;
  const navigate = useNavigate();

  const VIEW_FALLBACK: StudyView = "dashboard";
  const activeView: StudyView | typeof AI_ENTRY_VIEW = view ?? VIEW_FALLBACK;

  const {
    data: snapshot,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["learning-snapshot", userId],
    queryFn: () => getLearningSnapshot(userId as string),
    enabled: Boolean(userId),
    staleTime: 1000 * 60 * 2,
  });

  const refresh = () => {
    void refetch();
  };

  const navigateTo = useCallback(
    (newView: StudyView | typeof AI_ENTRY_VIEW, conceptId?: string) => {
      const search: Record<string, unknown> = { view: newView as StudyView };
      if (conceptId) search.concept = conceptId;
      navigate({ to: "/study", search, replace: true });
    },
    [navigate],
  );

  useEffect(() => {
    if (!userId && user !== null) {
      navigate({ to: "/auth" });
    }
  }, [userId, user, navigate]);

  const handleViewChange = (newView: StudyView) => {
    navigateTo(newView);
  };

  const handleConceptClick = (id: string) => {
    navigateTo("concepts", id);
  };

  const handleStartPractice = (conceptId?: string) => {
    navigateTo("practice", conceptId);
  };

  const handleStartTutor = (conceptId?: string) => {
    navigateTo("tutor", conceptId);
  };

  const handleAISubmit = useCallback(
    (message: string) => {
      if (!snapshot || !message.trim()) return;
      const detected = detectTopic(message);
      const input = {
        snapshot,
        availableMinutes: 120,
        energyLevel: "medium" as const,
        explicitIntent: message,
      };
      const missions = generateDailyMissions(input);
      const topMission = missions[0];

      if (topMission && topMission.tasks.length > 0) {
        const firstTask = topMission.tasks[0];
        switch (firstTask.type) {
          case "tutor":
            navigateTo("tutor", firstTask.conceptId ?? undefined);
            break;
          case "practice":
          case "learn":
            navigateTo("practice", firstTask.conceptId ?? undefined);
            break;
          case "quiz":
            navigateTo("exams");
            break;
          case "flashcards":
          case "review":
            navigateTo("flashcards");
            break;
          default:
            navigateTo("tutor");
        }
        return;
      }

      if (detected.intent === "tutor" || detected.intent === "general") {
        navigateTo("tutor", detected.conceptId ?? undefined);
      } else if (detected.intent === "practice") {
        navigateTo("practice", detected.conceptId ?? undefined);
      } else if (detected.intent === "quiz" || detected.intent === "exam_prep") {
        navigateTo("exams");
      } else if (detected.intent === "flashcard" || detected.intent === "revise") {
        navigateTo("flashcards");
      } else {
        navigateTo("dashboard");
      }
    },
    [snapshot, navigateTo],
  );

  if (isLoading) {
    return (
      <AppShell>
        <LoadingState message="Loading your learning workspace..." />
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell>
        <div className="p-6">
          <p className="rounded-md bg-destructive/10 p-3 text-destructive">
            Your learning data could not be loaded.
          </p>
          <pre className="mt-2 rounded-md bg-destructive/5 p-3 text-xs text-destructive/90 break-words">
            {error instanceof Error ? error.message : String(error)}
          </pre>
        </div>
      </AppShell>
    );
  }

  if (userId && snapshot && !snapshot.profile?.class) {
    return (
      <AppShell>
        <StudyOnboarding userId={userId} onClose={refresh} />
      </AppShell>
    );
  }

  if (activeView === AI_ENTRY_VIEW) {
    if (!snapshot) {
      return (
        <AppShell>
          <LoadingState message="Loading your learning workspace..." />
        </AppShell>
      );
    }
    return (
      <AppShell>
        <AIStudyEntry
          snapshot={snapshot}
          userId={userId}
          onSubmit={handleAISubmit}
          onNavigate={handleViewChange}
          onStartPractice={handleStartPractice}
          onStartTutor={handleStartTutor}
          refresh={refresh}
        />
      </AppShell>
    );
  }

  const views: Record<StudyView, ReactNode> = {
    dashboard: (
      <DashboardView
        snapshot={snapshot}
        userId={userId}
        onNavigate={handleViewChange}
        onStartPractice={handleStartPractice}
        onStartTutor={handleStartTutor}
        onConceptClick={handleConceptClick}
        refresh={refresh}
      />
    ),
    concepts: conceptId ? (
      <ConceptDetail
        snapshot={snapshot}
        userId={userId}
        conceptId={conceptId}
        onNavigate={handleViewChange}
        onStartInContext={(view) => navigateTo(view, conceptId)}
        onBack={() => navigateTo("concepts")}
        refresh={refresh}
      />
    ) : (
      <ConceptBrowser
        snapshot={snapshot}
        userId={userId}
        onConceptClick={handleConceptClick}
        onNavigate={handleViewChange}
        refresh={refresh}
      />
    ),
    practice: (
      <PracticeView
        snapshot={snapshot}
        userId={userId}
        conceptId={conceptId}
        onNavigate={handleViewChange}
        onBack={() => navigateTo("dashboard")}
        refresh={refresh}
      />
    ),
    tutor: (
      <TutorView
        snapshot={snapshot}
        userId={userId}
        conceptId={conceptId}
        onNavigate={handleViewChange}
        onBack={() => navigateTo("dashboard")}
        refresh={refresh}
      />
    ),
    flashcards: (
      <FlashcardStudy
        snapshot={snapshot}
        userId={userId}
        onNavigate={handleViewChange}
        onBack={() => navigateTo("dashboard")}
        refresh={refresh}
      />
    ),
    exams: (
      <TestCenter
        snapshot={snapshot}
        userId={userId}
        onNavigate={handleViewChange}
        onBack={() => navigateTo("dashboard")}
        refresh={refresh}
      />
    ),
    planner: (
      <PlannerView
        snapshot={snapshot}
        userId={userId}
        onNavigate={handleViewChange}
        onBack={() => navigateTo("dashboard")}
        refresh={refresh}
      />
    ),
    progress: (
      <ProgressView
        snapshot={snapshot}
        userId={userId}
        onNavigate={handleViewChange}
        onBack={() => navigateTo("dashboard")}
        refresh={refresh}
      />
    ),
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        <StudyTopNav activeView={activeView as StudyView} onViewChange={handleViewChange} />
        <main className="flex-1 pb-8">{views[activeView as StudyView]}</main>
      </div>
    </AppShell>
  );
}
