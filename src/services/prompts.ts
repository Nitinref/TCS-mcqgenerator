import {
  Difficulty,
  DifficultyFilter,
  EmailScenarioType,
  PassageTopic,
  SentenceCategory,
} from "../types";

export const sentenceCategories: SentenceCategory[] = [
  "Vocabulary",
  "Context-based completion",
  "Prepositions",
  "Articles",
  "Conjunctions",
  "Verb Forms",
  "Workplace English",
  "Business Communication",
  "Common English Usage",
];

export const passageTopics: PassageTopic[] = [
  "Technology",
  "AI",
  "Education",
  "Business",
  "Environment",
  "Health",
  "Productivity",
];

export const emailTypes: EmailScenarioType[] = [
  "Leave Request",
  "Complaint Email",
  "Meeting Request",
  "Project Update",
  "Internship Application",
  "Customer Support",
  "Team Communication",
];

export function systemPrompt() {
  return [
    "You generate and evaluate personal TCS NQT Verbal Ability practice content.",
    "Do not include leaderboards, social features, rankings, chat, or community elements.",
    "Use clear Indian campus-placement/business English context.",
    "Return only valid JSON. Do not wrap JSON in markdown.",
  ].join(" ");
}

export function sentencePrompt(options: {
  difficulty: DifficultyFilter;
  weakTopics: string[];
  recentPrompts: string[];
  count?: number;
}) {
  const count = options.count ?? 1;
  const preferred =
    options.weakTopics.length > 0
      ? `Prioritize these weak areas: ${options.weakTopics.join(", ")}.`
      : "Choose a balanced topic from the allowed categories.";

  return `
Generate ${count} original TCS NQT style Sentence Completion questions.

Rules:
- Pattern: one blank in a sentence, one-word answer only.
- Timing context: student gets 30 seconds.
- Difficulty: ${options.difficulty}.
- Allowed categories: ${sentenceCategories.join(", ")}.
- ${preferred}
- Avoid repeating these recent prompts: ${options.recentPrompts.slice(-8).join(" | ") || "none"}.
- The answer must be a single word, lowercase unless a proper noun is required.
- Return exactly ${count} distinct questions.

Return this exact JSON shape:
{
  "questions": [
    {
      "id": "short-unique-id",
      "difficulty": "Easy | Medium | Hard",
      "category": "one allowed category",
      "prompt": "Sentence with ____ blank.",
      "answer": "oneword",
      "explanation": "Brief reason the answer fits."
    }
  ]
}
`.trim();
}

export function passagePrompt(difficulty: Difficulty, topic: PassageTopic) {
  return `
Generate one original TCS NQT Passage Recall prompt.

Rules:
- Difficulty: ${difficulty}.
- Topic: ${topic}.
- Paragraph must be 70-110 words for Easy, 100-140 for Medium, 130-170 for Hard.
- It should be realistic, factual-sounding, and easy to rewrite from memory.
- Include 4-6 key points for evaluation.

Return this exact JSON shape:
{
  "id": "short-unique-id",
  "difficulty": "${difficulty}",
  "topic": "${topic}",
  "paragraph": "paragraph text",
  "keyPoints": ["point 1", "point 2", "point 3", "point 4"]
}
`.trim();
}

export function emailPrompt(type: EmailScenarioType) {
  return `
Generate one original TCS NQT Email Writing scenario.

Rules:
- Scenario type: ${type}.
- Student has 9 minutes and must write at least 100 words.
- Scenario must be practical for workplace/campus placement communication.
- Include required points the student should cover.

Return this exact JSON shape:
{
  "id": "short-unique-id",
  "type": "${type}",
  "subjectHint": "suggested subject",
  "scenario": "scenario text",
  "mustInclude": ["point 1", "point 2", "point 3", "point 4"]
}
`.trim();
}

export function passageEvaluationPrompt(payload: {
  paragraph: string;
  keyPoints: string[];
  response: string;
}) {
  return `
Evaluate this TCS Passage Recall response.

Original paragraph:
${payload.paragraph}

Key points:
${payload.keyPoints.join("\n")}

Student response:
${payload.response}

Score each area from 0 to 100 and provide concise feedback.
Return this exact JSON shape:
{
  "score": 0,
  "mainIdeaRetention": 0,
  "contentAccuracy": 0,
  "clarity": 0,
  "grammar": 0,
  "coherence": 0,
  "feedback": "concise feedback",
  "missingPoints": ["missing or weak point"]
}
`.trim();
}

export function emailEvaluationPrompt(payload: {
  scenario: string;
  mustInclude: string[];
  subject: string;
  body: string;
}) {
  return `
Evaluate this TCS Email Writing response.

Scenario:
${payload.scenario}

Required points:
${payload.mustInclude.join("\n")}

Subject:
${payload.subject}

Email body:
${payload.body}

Score each area from 0 to 100. Penalize if under 100 words.
Return this exact JSON shape:
{
  "score": 0,
  "subjectLine": 0,
  "structure": 0,
  "professionalTone": 0,
  "grammar": 0,
  "completeness": 0,
  "feedback": "concise feedback",
  "improvements": ["specific improvement"]
}
`.trim();
}
