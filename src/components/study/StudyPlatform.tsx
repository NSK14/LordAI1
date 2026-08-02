import type { ReactNode } from "react";
import { useSearch, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppShell } from "@/components/lord/AppShell";
import { useCurrentUser } from "@/hooks/use-current-user";
import { getLearningSnapshot } from "@/lib/learning/client";
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
import { LoadingState } from "./ui/LoadingState";
import type { StudyView } from "./types";

export function StudyPlatform() {
  const { view = "dashboard", concept: conceptId } = useSearch({
    from: "/_authenticated/study",
  }) as { view?: StudyView; concept?: string };

  const { user } = useCurrentUser();
  const userId = user?.id ?? null;
  const navigate = useNavigate();

  const VIEW_FALLBACK: StudyView = "dashboard";
  const activeView: StudyView = view ?? VIEW_FALLBACK;

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

  const navigateTo = (newView: StudyView, conceptId?: string) => {
    const search: Record<string, unknown> = { view: newView };
    if (conceptId) search.concept = conceptId;
    navigate({ to: "/study", search, replace: true });
  };

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

  const views: Record<StudyView, ReactNode> = {
    dashboard: (
      <DashboardView
        snapshot={snapshot}
        userId={userId}
        onNavigate={handleViewChange}
        onStartPractice={handleStartPractice}
        onStartTutor={handleStartTutor}
        onConceptClick={handleConceptClick}
      />
    ),
    concepts: conceptId ? (
      <ConceptDetail
        snapshot={snapshot}
        userId={userId}
        conceptId={conceptId}
        onNavigate={handleViewChange}
        onBack={() => navigateTo("concepts")}
      />
    ) : (
      <ConceptBrowser
        snapshot={snapshot}
        userId={userId}
        onConceptClick={handleConceptClick}
        onNavigate={handleViewChange}
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
        <StudyTopNav activeView={activeView} onViewChange={handleViewChange} />
        <main className="flex-1 pb-8">
          {isLoading ? (
            <LoadingState message="Loading your learning workspace…" />
          ) : error ? (
            <div className="p-6">
              <p className="rounded-md bg-destructive/10 p-3 text-destructive">
                Your learning data could not be loaded. Please refresh and try again.
              </p>
            </div>
          ) : (
            views[activeView]
          )}
        </main>
      </div>
    </AppShell>
  );
}
