export type Difficulty = "Easy" | "Medium" | "Hard";
export type DifficultyFilter = Difficulty | "Mixed";

export type SentenceCategory =
  | "Vocabulary"
  | "Context-based completion"
  | "Prepositions"
  | "Articles"
  | "Conjunctions"
  | "Verb Forms"
  | "Workplace English"
  | "Business Communication"
  | "Common English Usage";

export type PassageTopic =
  | "Technology"
  | "AI"
  | "Education"
  | "Business"
  | "Environment"
  | "Health"
  | "Productivity";

export type EmailScenarioType =
  | "Leave Request"
  | "Complaint Email"
  | "Meeting Request"
  | "Project Update"
  | "Internship Application"
  | "Customer Support"
  | "Team Communication";

export interface SentenceQuestion {
  id: string;
  difficulty: Difficulty;
  category: SentenceCategory;
  prompt: string;
  answer: string;
  explanation: string;
}

export interface PassagePrompt {
  id: string;
  difficulty: Difficulty;
  topic: PassageTopic;
  paragraph: string;
  keyPoints: string[];
}

export interface EmailPrompt {
  id: string;
  type: EmailScenarioType;
  subjectHint: string;
  scenario: string;
  mustInclude: string[];
}

export interface AiSettings {
  apiKey: string;
  model: string;
}

export interface EmailEvaluation {
  score: number;
  subjectLine: number;
  structure: number;
  professionalTone: number;
  grammar: number;
  completeness: number;
  feedback: string;
  improvements: string[];
}

export interface PassageEvaluation {
  score: number;
  mainIdeaRetention: number;
  contentAccuracy: number;
  clarity: number;
  grammar: number;
  coherence: number;
  feedback: string;
  missingPoints: string[];
}

export interface AttemptRecord {
  id: string;
  mode: "Sentence" | "Passage" | "Email" | "Mock";
  topic: string;
  difficulty?: Difficulty;
  correct: boolean;
  score: number;
  timeSpent: number;
  createdAt: string;
}

export interface MistakeRecord {
  id: string;
  questionId: string;
  topic: string;
  prompt: string;
  answer: string;
  submitted: string;
  explanation: string;
  misses: number;
  updatedAt: string;
}

export interface PracticeState {
  attempts: AttemptRecord[];
  mistakes: MistakeRecord[];
  recentQuestionIds: string[];
  emailDrafts: Record<string, string>;
  startedAt: string;
  darkMode: boolean;
  aiSettings: AiSettings;
}
