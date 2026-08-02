import { useSearch, useNavigate } from "@tanstack/react-router";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useStudyDashboard } from "@/hooks/study/useStudyDashboard";
import { AppShell } from "@/components/lord/AppShell";
import { StudyShell } from "@/components/learning/StudyShell";
import { StudyLanding } from "@/components/study/StudyLanding";
import { NotesWorkspace } from "@/components/study/NotesWorkspace";
import { RevisionWorkspace } from "@/components/study/RevisionWorkspace";
import { FlashcardWorkspace } from "@/components/study/FlashcardWorkspace";
import { MCQWorkspace } from "@/components/study/MCQWorkspace";
import { HomeworkHelpWorkspace } from "@/components/study/HomeworkHelpWorkspace";
import { ProactiveStreakNudge } from "@/components/study/ProactiveStreakNudge";
import type { StudyNavigationMode } from "@/hooks/study/study-activity-types";

/**
 * StudyRouter — single-page view-switcher for the /study route.
 *
 * Reads the validated `view` search param and renders the appropriate
 * component. Premium workspaces (notes, flashcards, test, revision, plan,
 * help, mnemonics) receive `recordActivity` so the dashboard reflects activity
 * across all views.
 */
export function StudyRouter() {
  const { view = "landing" } = useSearch({ from: "/_authenticated/study" }) as {
    view?: string;
  };
  const { user } = useCurrentUser();
  const userId = user?.id ?? null;
  const navigate = useNavigate();

  const { data, recordActivity } = useStudyDashboard(userId);

  const handleNavigate = (mode: StudyNavigationMode) => {
    const viewMap: Record<StudyNavigationMode, string> = {
      tutor: "tutor",
      tasks: "notes",
      test: "test",
    };
    navigate({ to: "/study", search: { view: viewMap[mode] } } as never);
  };

  const handleContinueLearning = () => {
    navigate({ to: "/study", search: { view: "learn" } });
  };

  const handleReturnHome = () => {
    navigate({ to: "/study", search: { view: "landing" } });
  };

  switch (view) {
    case "landing":
      return (
        <AppShell>
          <div className="mx-auto max-w-6xl p-6 pb-16">
            <ProactiveStreakNudge streak={data.studyStreak} recordActivity={recordActivity} />
            <StudyLanding
              data={data}
              onNavigate={handleNavigate}
              onContinueLearning={handleContinueLearning}
            />
          </div>
        </AppShell>
      );

    case "help":
      return <HomeworkHelpWorkspace onReturnHome={handleReturnHome} />;

    case "notes":
      return <NotesWorkspace recordActivity={recordActivity} onReturnHome={handleReturnHome} />;

    case "plan":
    case "revision":
      return <RevisionWorkspace recordActivity={recordActivity} onReturnHome={handleReturnHome} />;

    case "flashcards":
    case "mnemonics":
      return (
        <FlashcardWorkspace
          onGenerate={() => {}}
          onImport={() => {}}
          streak={data.studyStreak}
          recordActivity={recordActivity}
          focus={view === "mnemonics" ? "mnemonics" : undefined}
          onReturnHome={handleReturnHome}
        />
      );

    case "test":
      return <MCQWorkspace recordActivity={recordActivity} onReturnHome={handleReturnHome} />;

    case "learn":
    case "practice":
    case "feed":
    case "boards":
    case "progress":
    case "tutor":
    default:
      return <StudyShell />;
  }
}
