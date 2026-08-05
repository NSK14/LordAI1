import { ClassSelector } from "./ClassSelector";
import type { LearningProfile } from "@/lib/learning/types";

interface StudyOnboardingProps {
  userId: string | null;
  onClose: () => void;
}

export function StudyOnboarding({ userId, onClose }: StudyOnboardingProps) {
  if (!userId) return null;
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6">
      <ClassSelector userId={userId} onSaved={onClose} />
    </div>
  );
}
