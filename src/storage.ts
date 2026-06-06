import { PracticeState } from "./types";

const STORAGE_KEY = "tcs-verbal-practice-hub:v1";

export const defaultState: PracticeState = {
  attempts: [],
  mistakes: [],
  recentQuestionIds: [],
  emailDrafts: {},
  startedAt: new Date().toISOString(),
  darkMode: true,
  aiSettings: {
    apiKey: "",
    model: "openrouter/free",
  },
};

export function loadState(): PracticeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaultState, ...JSON.parse(raw) } : defaultState;
  } catch {
    return defaultState;
  }
}

export function saveState(state: PracticeState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState() {
  localStorage.removeItem(STORAGE_KEY);
}
