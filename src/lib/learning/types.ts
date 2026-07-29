export type LearningFramework = "CBSE" | "COMMON_CORE" | "NGSS";
export type GradeBand = "middle" | "high";
export type Question = {
  id: string;
  conceptId: string;
  prompt: string;
  choices: string[];
  correctIndex: number;
  hint: string;
  explanation: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  rubric: string;
};

export type Mastery = {
  concept_id: string;
  score: number;
  confidence: number;
  evidence_count: number;
  next_review_at: string | null;
};

export type LearningConcept = {
  id: string;
  standard_code: string;
  framework: LearningFramework;
  subject: string;
  grade_band: GradeBand;
  title: string;
  description: string;
  prerequisites: string[];
};

export const AI_GENERATED_NOTICE =
  "AI-generated learning support. Check important answers against your course materials or a trusted source.";
