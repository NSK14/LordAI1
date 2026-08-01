/**
 * MCQ — type definitions
 */

export interface MCQOption {
  id: string; // "A", "B", "C", "D"
  text: string;
}

export interface MCQQuestion {
  id: string;
  question: string;
  options: MCQOption[];
  answer: string; // correct option id
  explanation?: string;
}

export interface ParsedMCQResult {
  questions: MCQQuestion[];
}

export type MCQAnswerMap = Record<string, string>;
