import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BookOpenCheck,
  Brain,
  CheckCircle2,
  Clock,
  FileText,
  Mail,
  Moon,
  RotateCcw,
  Send,
  Settings,
  Sparkles,
  Sun,
  Target,
  TimerReset,
  TrendingUp,
  XCircle,
} from "lucide-react";
import {
  AttemptRecord,
  Difficulty,
  DifficultyFilter,
  EmailEvaluation,
  EmailPrompt,
  EmailScenarioType,
  MistakeRecord,
  PassageEvaluation,
  PassagePrompt,
  PassageTopic,
  PracticeState,
  SentenceQuestion,
} from "./types";
import { defaultState, loadState, resetState, saveState } from "./storage";
import {
  emailEvaluationPrompt,
  emailPrompt,
  emailTypes,
  passageEvaluationPrompt,
  passagePrompt,
  passageTopics,
  sentencePrompt,
} from "./services/prompts";
import { generateJson } from "./services/openRouter";

type View = "Dashboard" | "Sentence" | "Passage" | "Email" | "Mock" | "Revision" | "Analytics";

const navItems: Array<{ view: View; icon: typeof Target }> = [
  { view: "Dashboard", icon: Target },
  { view: "Sentence", icon: Brain },
  { view: "Passage", icon: FileText },
  { view: "Email", icon: Mail },
  { view: "Mock", icon: TimerReset },
  { view: "Revision", icon: BookOpenCheck },
  { view: "Analytics", icon: BarChart3 },
];

const difficulties: Difficulty[] = ["Easy", "Medium", "Hard"];
const freeModels = [
  "openrouter/free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "qwen/qwen-2.5-7b-instruct:free",
  "mistralai/mistral-7b-instruct:free",
];

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function normalize(text: string) {
  return text.trim().toLowerCase().replace(/[^a-z]/g, "");
}

function Timer({
  seconds,
  running,
  onEnd,
  resetKey,
}: {
  seconds: number;
  running: boolean;
  onEnd: () => void;
  resetKey?: string;
}) {
  const [remaining, setRemaining] = useState(seconds);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    setRemaining(seconds);
    setEnded(false);
  }, [seconds, resetKey]);

  useEffect(() => {
    if (!running) return;
    if (remaining <= 0 && !ended) {
      setEnded(true);
      onEnd();
      return;
    }
    const id = window.setTimeout(() => setRemaining((value) => value - 1), 1000);
    return () => window.clearTimeout(id);
  }, [ended, onEnd, remaining, running]);

  const pct = Math.max(0, (remaining / seconds) * 100);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
        <span className="inline-flex items-center gap-2"><Clock size={16} /> Timer</span>
        <span className="font-semibold">{remaining}s</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Shell({ children, state, setState, view, setView }: {
  children: React.ReactNode;
  state: PracticeState;
  setState: (next: PracticeState) => void;
  view: View;
  setView: (view: View) => void;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  function updateSettings(key: "apiKey" | "model", value: string) {
    setState({ ...state, aiSettings: { ...state.aiSettings, [key]: value } });
  }

  return (
    <div className="min-h-screen bg-stone-50 text-slate-950 transition dark:bg-slate-950 dark:text-white">
      <aside className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 lg:inset-x-auto lg:inset-y-0 lg:left-0 lg:w-72 lg:border-r lg:border-t-0">
        <div className="hidden p-5 lg:block">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-emerald-500 text-white">
              <Sparkles size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold">TCS Verbal Practice Hub</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">AI-powered personal prep</p>
            </div>
          </div>
        </div>
        <nav className="grid grid-cols-7 gap-1 p-2 lg:grid-cols-1 lg:p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = item.view === view;
            return (
              <button
                key={item.view}
                onClick={() => setView(item.view)}
                className={`flex min-h-12 items-center justify-center gap-3 rounded-lg px-3 text-sm font-medium transition lg:justify-start ${
                  active
                    ? "bg-emerald-500 text-white shadow-soft"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
                }`}
                title={item.view}
              >
                <Icon size={19} />
                <span className="hidden lg:inline">{item.view}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="pb-24 lg:ml-72 lg:pb-0">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-stone-50/90 px-4 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 sm:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Personal practice only</p>
              <h2 className="text-xl font-bold sm:text-2xl">{view}</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSettingsOpen(true)}
                className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                title="AI settings"
              >
                <Settings size={18} />
              </button>
              <button
                onClick={() => setState({ ...state, darkMode: !state.darkMode })}
                className="grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
                title="Toggle dark mode"
              >
                {state.darkMode ? <Sun size={18} /> : <Moon size={18} />}
              </button>
            </div>
          </div>
        </header>
        <div className="mx-auto max-w-7xl p-4 sm:p-8">{children}</div>
      </main>

      {settingsOpen && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/60 p-4">
          <div className="w-full max-w-xl rounded-lg bg-white p-5 shadow-soft dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">OpenRouter AI Settings</h3>
              <button onClick={() => setSettingsOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" title="Close">
                <XCircle size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1 block text-sm font-medium">OpenRouter API Key</span>
                <input
                  type="password"
                  value={state.aiSettings.apiKey}
                  onChange={(event) => updateSettings("apiKey", event.target.value)}
                  placeholder="sk-or-v1-..."
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950"
                />
              </label>
              <Select
                label="Free OpenRouter Model"
                value={state.aiSettings.model || "openrouter/free"}
                onChange={(value) => updateSettings("model", value)}
                options={freeModels}
              />
              <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
                The app only allows <strong>openrouter/free</strong> or model IDs ending with <strong>:free</strong>. Your key stays in this browser via local storage.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, hint }: { icon: typeof Target; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
        <Icon size={18} className="text-emerald-500" />
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</div>}
    </div>
  );
}

function Dashboard({ state }: { state: PracticeState }) {
  const total = state.attempts.length;
  const correct = state.attempts.filter((attempt) => attempt.correct).length;
  const accuracy = total ? Math.round((correct / total) * 100) : 0;
  const practiceMinutes = Math.round(state.attempts.reduce((sum, attempt) => sum + attempt.timeSpent, 0) / 60);
  const topicStats = useMemo(() => getTopicStats(state), [state]);
  const weak = topicStats.filter((topic) => topic.accuracy < 60).slice(0, 4);
  const strong = topicStats.filter((topic) => topic.accuracy >= 75).slice(0, 4);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard icon={Target} label="Attempted" value={`${total}`} />
        <MetricCard icon={CheckCircle2} label="Correct" value={`${correct}`} />
        <MetricCard icon={TrendingUp} label="Accuracy" value={`${accuracy}%`} />
        <MetricCard icon={Sparkles} label="Current Streak" value={`${currentStreak(state.attempts)}`} />
        <MetricCard icon={Clock} label="Practice Time" value={`${practiceMinutes}m`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Weak Areas">
          {weak.length ? weak.map((topic) => <TopicRow key={topic.topic} {...topic} />) : <EmptyLine text="Attempt AI questions to reveal weak areas." />}
        </Panel>
        <Panel title="Strong Areas">
          {strong.length ? strong.map((topic) => <TopicRow key={topic.topic} {...topic} />) : <EmptyLine text="Strong areas appear after consistent accuracy." />}
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="mb-4 text-base font-bold">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="text-sm text-slate-500 dark:text-slate-400">{text}</p>;
}

function TopicRow({ topic, total, accuracy }: { topic: string; total: number; accuracy: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span>{topic}</span>
        <span className="font-semibold">{accuracy}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${accuracy}%` }} />
      </div>
      <div className="mt-1 text-xs text-slate-500">{total} attempts</div>
    </div>
  );
}

function SentencePractice({ state, setState }: { state: PracticeState; setState: (state: PracticeState) => void }) {
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("Mixed");
  const [question, setQuestion] = useState<SentenceQuestion | null>(null);
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastResult, setLastResult] = useState<{ correct: boolean; answer: string; explanation: string } | null>(null);
  const [questionsAnswered, setQuestionsAnswered] = useState(0);

  const weakTopics = getTopicStats(state).filter((topic) => topic.accuracy < 60).map((topic) => topic.topic);
  const recentPrompts = state.mistakes.slice(-6).map((mistake) => mistake.prompt);

  async function loadNextQuestion() {
    setLoading(true);
    setError("");
    setQuestion(null);
    setSubmitted(false);
    setAnswer("");
    setLastResult(null);
    try {
      const generated = await generateJson<{ questions: SentenceQuestion[] }>(
        state.aiSettings,
        sentencePrompt({ difficulty, weakTopics, recentPrompts, count: 1 }),
      );
      const questions = generated.questions ?? [];
      if (questions.length === 0) {
        throw new Error("AI did not return a question. Please try again.");
      }
      const newQuestion = questions[0];
      newQuestion.id = newQuestion.id || uid("sentence");
      setQuestion(newQuestion);
    } catch (event) {
      setError(event instanceof Error ? event.message : "Could not generate question. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function submit(finalAnswer = answer) {
    if (!question || submitted) return;
    const correct = normalize(finalAnswer) === normalize(question.answer);
    const attempt: AttemptRecord = {
      id: uid("attempt"),
      mode: "Sentence",
      topic: question.category,
      difficulty: question.difficulty,
      correct,
      score: correct ? 100 : 0,
      timeSpent: 30,
      createdAt: new Date().toISOString(),
    };
    const mistakes = correct ? state.mistakes : upsertMistake(state.mistakes, question, finalAnswer);
    setState({
      ...state,
      attempts: [...state.attempts, attempt],
      mistakes,
      recentQuestionIds: [...state.recentQuestionIds, question.id].slice(-40),
    });
    setSubmitted(true);
    setLastResult({ correct, answer: question.answer, explanation: question.explanation });
    setQuestionsAnswered(questionsAnswered + 1);

    // Auto-load next question after 2 seconds if not reached 20 yet
    if (questionsAnswered + 1 < 20) {
      setTimeout(() => {
        loadNextQuestion();
      }, 2000);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      <Panel title="AI Question Controls">
        <Select label="Difficulty" value={difficulty} onChange={(value) => setDifficulty(value as DifficultyFilter)} options={["Mixed", ...difficulties]} />
        <button onClick={loadNextQuestion} disabled={loading || questionsAnswered >= 20} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 font-semibold text-white hover:bg-emerald-600 disabled:opacity-60">
          <Sparkles size={18} /> {loading ? "Generating..." : questionsAnswered === 0 ? "Start: Generate First Question" : `Next Question (${questionsAnswered}/20)`}
        </button>
        <p className="text-sm text-slate-500 dark:text-slate-400">One question at a time. Answer it, and the next one loads automatically! You'll complete 20 total.</p>
        {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">{error}</p>}
      </Panel>

      <Panel title="Sentence Completion">
        {loading && !question ? (
          <EmptyLine text={questionsAnswered === 0 ? "Generating your first question..." : "Loading next question..."} />
        ) : question ? (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge>{question.difficulty}</Badge>
              <Badge>{question.category}</Badge>
              <Badge>{`Question ${questionsAnswered + 1} of 20`}</Badge>
            </div>
            <Timer seconds={30} running={!submitted && !loading} resetKey={question.id} onEnd={() => submit()} />
            <p className="text-xl font-semibold leading-relaxed">{question.prompt}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && submit()}
                disabled={submitted}
                placeholder="Type one-word answer"
                className="min-h-12 flex-1 rounded-lg border border-slate-200 bg-white px-3 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950"
              />
              <button onClick={() => submit()} disabled={submitted} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 font-semibold text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950">
                <Send size={17} /> Submit
              </button>
            </div>
            {lastResult && (
              <div className="rounded-lg bg-slate-100 p-4 dark:bg-slate-800">
                <div className="mb-2 flex items-center gap-2 font-bold">
                  {lastResult.correct ? <CheckCircle2 className="text-emerald-500" /> : <XCircle className="text-rose-500" />}
                  {lastResult.correct ? "Right" : "Wrong"} answer: {lastResult.answer}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">{lastResult.explanation}</p>
                {questionsAnswered < 20 && (
                  <p className="mt-2 text-xs text-slate-500">Next question loading automatically...</p>
                )}
                {questionsAnswered >= 20 && (
                  <p className="mt-2 font-bold text-emerald-600">🎉 All 20 questions completed!</p>
                )}
              </div>
            )}
          </div>
        ) : (
          <EmptyLine text="Add your OpenRouter key, then click 'Start' to generate your first question." />
        )}
      </Panel>
    </div>
  );
}

function PassagePractice({ state, setState }: { state: PracticeState; setState: (state: PracticeState) => void }) {
  const [difficulty, setDifficulty] = useState<Difficulty>("Easy");
  const [topic, setTopic] = useState<PassageTopic>("Technology");
  const [passage, setPassage] = useState<PassagePrompt | null>(null);
  const [phase, setPhase] = useState<"idle" | "read" | "write" | "done">("idle");
  const [response, setResponse] = useState("");
  const [evaluation, setEvaluation] = useState<PassageEvaluation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [writeExpired, setWriteExpired] = useState(false);

  async function generatePassage() {
    setLoading(true);
    setError("");
    setResponse("");
    setEvaluation(null);
    setWriteExpired(false);
    try {
      const generated = await generateJson<PassagePrompt>(state.aiSettings, passagePrompt(difficulty, topic));
      setPassage({ ...generated, id: generated.id || uid("passage") });
      setPhase("read");
    } catch (event) {
      setError(event instanceof Error ? event.message : "Could not generate passage.");
    } finally {
      setLoading(false);
    }
  }

  async function evaluate() {
    if (!passage) return;
    setLoading(true);
    try {
      const result = await generateJson<PassageEvaluation>(state.aiSettings, passageEvaluationPrompt({ paragraph: passage.paragraph, keyPoints: passage.keyPoints, response }));
      setEvaluation(result);
      setPhase("done");
      setState({
        ...state,
        attempts: [...state.attempts, {
          id: uid("attempt"),
          mode: "Passage",
          topic: passage.topic,
          difficulty: passage.difficulty,
          correct: result.score >= 60,
          score: result.score,
          timeSpent: 120,
          createdAt: new Date().toISOString(),
        }],
      });
    } catch (event) {
      setError(event instanceof Error ? event.message : "Could not evaluate response.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <Panel title="Passage Recall Setup">
        <div className="grid gap-3 sm:grid-cols-3">
          <Select label="Difficulty" value={difficulty} onChange={(value) => setDifficulty(value as Difficulty)} options={difficulties} />
          <Select label="Topic" value={topic} onChange={(value) => setTopic(value as PassageTopic)} options={passageTopics} />
          <button onClick={generatePassage} disabled={loading} className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 font-semibold text-white hover:bg-emerald-600 disabled:opacity-60">
            <Sparkles size={18} /> {loading ? "Working..." : "Generate"}
          </button>
        </div>
        {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">{error}</p>}
      </Panel>

      {passage && (
        <Panel title={phase === "read" ? "Read for 30 seconds" : "Rewrite from memory"}>
          {phase === "read" && (
            <div className="space-y-4">
              <Timer seconds={30} running resetKey={passage.id} onEnd={() => setPhase("write")} />
              <p className="rounded-lg bg-slate-100 p-4 leading-relaxed dark:bg-slate-800">{passage.paragraph}</p>
            </div>
          )}
          {(phase === "write" || phase === "done") && (
            <div className="space-y-4">
              {phase === "write" && <Timer seconds={90} running={!writeExpired} resetKey={`${passage.id}-write`} onEnd={() => setWriteExpired(true)} />}
              {writeExpired && phase === "write" && (
                <p className="rounded-lg bg-amber-50 p-3 text-sm font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-100">
                  Time is over. Your summary is locked; click submit for AI analysis.
                </p>
              )}
              <textarea value={response} onChange={(event) => setResponse(event.target.value)} disabled={phase === "done" || writeExpired} rows={8} className="w-full rounded-lg border border-slate-200 bg-white p-3 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950" placeholder="Write a summary of the passage from memory..." />
              <button onClick={evaluate} disabled={loading || phase === "done"} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950">
                <CheckCircle2 size={18} /> Submit for AI Analysis
              </button>
            </div>
          )}
          {evaluation && <EvaluationBox title={`Score ${evaluation.score}/100`} text={evaluation.feedback} items={evaluation.missingPoints} />}
        </Panel>
      )}
    </div>
  );
}

function EmailPractice({ state, setState }: { state: PracticeState; setState: (state: PracticeState) => void }) {
  const [type, setType] = useState<EmailScenarioType>("Project Update");
  const [prompt, setPrompt] = useState<EmailPrompt | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [evaluation, setEvaluation] = useState<EmailEvaluation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timeExpired, setTimeExpired] = useState(false);

  useEffect(() => {
    if (prompt) {
      setState({ ...state, emailDrafts: { ...state.emailDrafts, [prompt.id]: body } });
    }
  }, [body]);

  async function generateScenario() {
    setLoading(true);
    setError("");
    setEvaluation(null);
    setTimeExpired(false);
    setBody("");
    setSubject("");
    try {
      const randomType = emailTypes[Math.floor(Math.random() * emailTypes.length)];
      setType(randomType);
      const generated = await generateJson<EmailPrompt>(state.aiSettings, emailPrompt(randomType));
      setPrompt({ ...generated, id: generated.id || uid("email") });
      setSubject(generated.subjectHint);
    } catch (event) {
      setError(event instanceof Error ? event.message : "Could not generate email scenario.");
    } finally {
      setLoading(false);
    }
  }

  async function evaluateEmail() {
    if (!prompt) return;
    setLoading(true);
    try {
      const result = await generateJson<EmailEvaluation>(state.aiSettings, emailEvaluationPrompt({ scenario: prompt.scenario, mustInclude: prompt.mustInclude, subject, body }));
      setEvaluation(result);
      setState({
        ...state,
        attempts: [...state.attempts, {
          id: uid("attempt"),
          mode: "Email",
          topic: prompt.type,
          correct: result.score >= 60,
          score: result.score,
          timeSpent: 540,
          createdAt: new Date().toISOString(),
        }],
        emailDrafts: { ...state.emailDrafts, [prompt.id]: body },
      });
    } catch (event) {
      setError(event instanceof Error ? event.message : "Could not evaluate email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <Panel title="Email Writing Setup">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="rounded-lg bg-slate-100 p-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Random AI topic. Current type: <span className="font-semibold text-slate-900 dark:text-white">{type}</span>
          </div>
          <button onClick={generateScenario} disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 font-semibold text-white hover:bg-emerald-600 disabled:opacity-60">
            <Sparkles size={18} /> {loading ? "Working..." : "Generate Random Topic"}
          </button>
        </div>
        {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-500/10 dark:text-rose-200">{error}</p>}
      </Panel>

      {prompt && (
        <Panel title="9 Minute Email Practice">
          <div className="space-y-4">
            <Timer seconds={540} running={!evaluation && !timeExpired} resetKey={prompt.id} onEnd={() => setTimeExpired(true)} />
            {timeExpired && !evaluation && (
              <p className="rounded-lg bg-amber-50 p-3 text-sm font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-100">
                Time is over. Your email is locked; click submit for AI analysis.
              </p>
            )}
            <p className="rounded-lg bg-slate-100 p-4 text-sm leading-relaxed dark:bg-slate-800">{prompt.scenario}</p>
            <input value={subject} onChange={(event) => setSubject(event.target.value)} disabled={!!evaluation || timeExpired} placeholder="Subject line" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-3 outline-none focus:border-emerald-500 disabled:opacity-75 dark:border-slate-700 dark:bg-slate-950" />
            <textarea value={body} onChange={(event) => setBody(event.target.value)} disabled={!!evaluation || timeExpired} rows={10} placeholder="Write your email..." className="w-full rounded-lg border border-slate-200 bg-white p-3 outline-none focus:border-emerald-500 disabled:opacity-75 dark:border-slate-700 dark:bg-slate-950" />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className={`text-sm font-semibold ${wordCount(body) >= 100 ? "text-emerald-600" : "text-amber-600"}`}>{wordCount(body)} / 100 words</span>
              <button onClick={evaluateEmail} disabled={loading || !!evaluation} className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-3 font-semibold text-white hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950">
                <CheckCircle2 size={18} /> Submit for AI Analysis
              </button>
            </div>
          </div>
          {evaluation && <EvaluationBox title={`Score ${evaluation.score}/100`} text={evaluation.feedback} items={evaluation.improvements} />}
        </Panel>
      )}
    </div>
  );
}

function MockMode({ state, setState }: { state: PracticeState; setState: (state: PracticeState) => void }) {
  return (
    <Panel title="Mock Test Mode">
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          Mock mode uses the same OpenRouter AI engine: 20 sentence questions, 4 passage recall prompts, and 1 email scenario. Start with section practice once, then use this as your full-test checklist.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard icon={Brain} label="Sentence" value="20 x 30s" />
          <MetricCard icon={FileText} label="Passage Recall" value="4 x 120s" />
          <MetricCard icon={Mail} label="Email" value="1 x 9m" />
        </div>
        <button
          onClick={() =>
            setState({
              ...state,
              attempts: [...state.attempts, {
                id: uid("attempt"),
                mode: "Mock",
                topic: "Full Verbal Section",
                correct: true,
                score: 0,
                timeSpent: 0,
                createdAt: new Date().toISOString(),
              }],
            })
          }
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 font-semibold text-white hover:bg-emerald-600"
        >
          <TimerReset size={18} /> Mark Mock Session Started
        </button>
      </div>
    </Panel>
  );
}

function Revision({ state }: { state: PracticeState }) {
  return (
    <div className="space-y-5">
      <Panel title="Mistake Notebook">
        {state.mistakes.length ? state.mistakes.map((mistake) => (
          <div key={mistake.id} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
            <div className="mb-2 flex flex-wrap gap-2"><Badge>{mistake.topic}</Badge><Badge>{mistake.misses} misses</Badge></div>
            <p className="font-semibold">{mistake.prompt}</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Your answer: {mistake.submitted || "blank"} | Correct: {mistake.answer}</p>
            <p className="mt-2 text-sm">{mistake.explanation}</p>
          </div>
        )) : <EmptyLine text="Incorrect AI-generated sentence questions will appear here for revision." />}
      </Panel>
    </div>
  );
}

function Analytics({ state }: { state: PracticeState }) {
  const daily = getDailyStats(state.attempts);
  const topicStats = getTopicStats(state);
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Daily Progress">
        {daily.map((item) => <TopicRow key={item.topic} topic={item.topic} total={item.total} accuracy={item.accuracy} />)}
        {!daily.length && <EmptyLine text="Daily analytics appear after practice." />}
      </Panel>
      <Panel title="Topic Performance">
        {topicStats.map((item) => <TopicRow key={item.topic} topic={item.topic} total={item.total} accuracy={item.accuracy} />)}
        {!topicStats.length && <EmptyLine text="Topic performance appears after AI evaluations." />}
      </Panel>
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-950">
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{children}</span>;
}

function EvaluationBox({ title, text, items }: { title: string; text: string; items: string[] }) {
  return (
    <div className="mt-4 rounded-lg bg-emerald-50 p-4 dark:bg-emerald-500/10">
      <h4 className="font-bold text-emerald-700 dark:text-emerald-300">{title}</h4>
      <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{text}</p>
      {!!items?.length && <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">{items.map((item) => <li key={item}>{item}</li>)}</ul>}
    </div>
  );
}

function getTopicStats(state: PracticeState) {
  const grouped = state.attempts.reduce<Record<string, { total: number; correct: number }>>((acc, attempt) => {
    acc[attempt.topic] ||= { total: 0, correct: 0 };
    acc[attempt.topic].total += 1;
    acc[attempt.topic].correct += attempt.correct ? 1 : 0;
    return acc;
  }, {});
  return Object.entries(grouped)
    .map(([topic, value]) => ({ topic, total: value.total, accuracy: Math.round((value.correct / value.total) * 100) }))
    .sort((a, b) => a.accuracy - b.accuracy);
}

function getDailyStats(attempts: AttemptRecord[]) {
  const grouped = attempts.reduce<Record<string, { total: number; correct: number }>>((acc, attempt) => {
    const key = todayKey(new Date(attempt.createdAt));
    acc[key] ||= { total: 0, correct: 0 };
    acc[key].total += 1;
    acc[key].correct += attempt.correct ? 1 : 0;
    return acc;
  }, {});
  return Object.entries(grouped).map(([topic, value]) => ({ topic, total: value.total, accuracy: Math.round((value.correct / value.total) * 100) }));
}

function currentStreak(attempts: AttemptRecord[]) {
  let streak = 0;
  for (let index = attempts.length - 1; index >= 0; index -= 1) {
    if (!attempts[index].correct) break;
    streak += 1;
  }
  return streak;
}

function upsertMistake(mistakes: MistakeRecord[], question: SentenceQuestion, submitted: string) {
  const existing = mistakes.find((mistake) => mistake.questionId === question.id);
  if (existing) {
    return mistakes.map((mistake) =>
      mistake.questionId === question.id
        ? { ...mistake, submitted, misses: mistake.misses + 1, updatedAt: new Date().toISOString() }
        : mistake,
    );
  }
  return [...mistakes, {
    id: uid("mistake"),
    questionId: question.id,
    topic: question.category,
    prompt: question.prompt,
    answer: question.answer,
    submitted,
    explanation: question.explanation,
    misses: 1,
    updatedAt: new Date().toISOString(),
  }];
}

export default function App() {
  const [state, setStateValue] = useState<PracticeState>(() => loadState());
  const [view, setView] = useState<View>("Dashboard");

  function setState(next: PracticeState) {
    setStateValue(next);
    saveState(next);
  }

  useEffect(() => {
    document.documentElement.classList.toggle("dark", state.darkMode);
  }, [state.darkMode]);

  function clearAll() {
    resetState();
    setStateValue(defaultState);
  }

  const content = {
    Dashboard: <Dashboard state={state} />,
    Sentence: <SentencePractice state={state} setState={setState} />,
    Passage: <PassagePractice state={state} setState={setState} />,
    Email: <EmailPractice state={state} setState={setState} />,
    Mock: <MockMode state={state} setState={setState} />,
    Revision: <Revision state={state} />,
    Analytics: <Analytics state={state} />,
  }[view];

  return (
    <Shell state={state} setState={setState} view={view} setView={setView}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-500 dark:text-slate-400">
          AI generation via OpenRouter free models only. Your key and progress stay in local storage.
        </div>
        <button onClick={clearAll} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800">
          <RotateCcw size={16} /> Reset Local Data
        </button>
      </div>
      {content}
    </Shell>
  );
}
