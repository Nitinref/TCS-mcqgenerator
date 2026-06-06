import { AiSettings } from "../types";
import { systemPrompt } from "./prompts";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second
const REQUEST_TIMEOUT = 30000; // 30 seconds

export async function generateJson<T>(settings: AiSettings, prompt: string): Promise<T> {
  if (!settings.apiKey.trim()) {
    throw new Error("Add your OpenRouter API key in AI Settings first.");
  }

  const model = settings.model.trim() || "openrouter/free";
  if (model !== "openrouter/free" && !model.endsWith(":free")) {
    throw new Error("Only OpenRouter free models are allowed. Use openrouter/free or a model ID ending with :free.");
  }

  let lastError: Error | null = null;

  // Retry logic with exponential backoff for rate limiting
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

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
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle rate limiting (429) and server errors (5xx)
      if (response.status === 429 || response.status >= 500) {
        const delayMs = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
        lastError = new Error(
          `Rate limited (attempt ${attempt + 1}/${MAX_RETRIES}). Retrying in ${delayMs}ms...`
        );
        if (attempt < MAX_RETRIES - 1) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        }
      }

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || `OpenRouter request failed with status ${response.status}.`);
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
    } catch (error) {
      if (error instanceof Error) {
        // Abort errors due to timeout
        if (error.name === "AbortError") {
          lastError = new Error(
            `Request timeout (attempt ${attempt + 1}/${MAX_RETRIES}). The free model is overloaded.`
          );
          if (attempt < MAX_RETRIES - 1) {
            const delayMs = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            continue;
          }
        } else {
          lastError = error;
        }
      }
    }
  }

  throw (
    lastError ||
    new Error(
      "OpenRouter request failed after retries. The free model may be overloaded. Try again in a few moments."
    )
  );
}
