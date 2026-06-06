import { AiSettings } from "../types";
import { systemPrompt } from "./prompts";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export async function generateJson<T>(settings: AiSettings, prompt: string): Promise<T> {
  if (!settings.apiKey.trim()) {
    throw new Error("Add your OpenRouter API key in AI Settings first.");
  }

  const model = settings.model.trim() || "openrouter/free";
  if (model !== "openrouter/free" && !model.endsWith(":free")) {
    throw new Error("Only OpenRouter free models are allowed. Use openrouter/free or a model ID ending with :free.");
  }

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${settings.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": window.location.origin,
      "X-Title": "TCS Verbal Practice Hub",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt() },
        { role: "user", content: prompt },
      ],
      temperature: 0.85,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "OpenRouter request failed.");
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenRouter returned an empty response.");

  try {
    return JSON.parse(content) as T;
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as T;
    throw new Error("AI response was not valid JSON.");
  }
}
