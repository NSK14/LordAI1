import type { GradeBand, LearningConcept } from "./types";

export function classToGradeBand(
  classNumber: string | number | null | undefined,
): GradeBand | null {
  if (classNumber === null || classNumber === undefined || classNumber === "") return null;
  const n =
    typeof classNumber === "number" ? classNumber : Number.parseInt(String(classNumber), 10);
  if (Number.isNaN(n)) return null;
  if (n <= 5) return "elementary";
  if (n <= 8) return "middle";
  return "high";
}

export function getConceptClass(
  concept: Pick<LearningConcept, "id" | "standard_code">,
): number | null {
  const standardCode = concept.standard_code ?? "";
  const id = concept.id ?? "";

  let m = standardCode.match(/^(?:CBSE|NCERT)-?(\d{1,2})-/);
  if (m) return Number(m[1]);

  m = id.match(/^cbse-[a-z]+-(\d{1,2})-/) ?? id.match(/^ncert-[a-z]+-(\d{1,2})-/);
  if (m) return Number(m[1]);

  m = standardCode.match(/CCSS\.[A-Z]+\.(\d{1,2})\./);
  if (m) return Number(m[1]);

  // NGSS (MS-/HS-) and CCSS.MATH.HS have no single class -> null.
  return null;
}
