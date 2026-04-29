import type {
  EvaluateAnswerInput,
  GenerateQuestionInput,
  ILlmService,
  LlmEvaluationDraft,
  LlmUsage,
} from "../../../application/ports/services.js";

type GroqConfig = {
  apiKey?: string;
  baseUrl?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  timeoutMs: number;
};

export class GroqProvider implements ILlmService {
  constructor(private readonly cfg: GroqConfig) {}

  async generateQuestion(input: GenerateQuestionInput): Promise<{ text: string; usage?: LlmUsage }> {
    this.assertApiKey();

    const prompt = [
      "You generate interview questions.",
      input.prompt ? `Interview Prompt: ${input.prompt}` : "",
      `Role: ${input.role}`,
      `Level: ${input.level}`,
      `Language: ${input.language}`,
      `Previous: ${JSON.stringify(input.previousQuestions)}`,
      'Return ONLY JSON: {"text":"..."}',
    ].join("\n");

    const json = await this.callGroq(prompt);
    const text = json?.text;
    if (typeof text !== "string" || !text.trim()) {
      throw new Error("LLM_INVALID_QUESTION_PAYLOAD");
    }
    return { text, usage: json.__usage };
  }

  async evaluateAnswer(input: EvaluateAnswerInput): Promise<LlmEvaluationDraft> {
    this.assertApiKey();

    const prompt = [
      "You evaluate interview answers strictly.",
      `Question: ${input.question}`,
      `Answer: ${input.answer.text}`,
      `Rubric: ${JSON.stringify(input.rubric.dimensions)}`,
      "Return ONLY JSON:",
      '{"score": number, "dimensionScores": {}, "strengths": string[], "improvements": string[], "confidence": number}',
      "Rules: score 0..100, confidence 0..1.",
    ].join("\n");

    const json = await this.callGroq(prompt);
    const draft: LlmEvaluationDraft = {
      score: Number(json?.score),
      dimensionScores: json?.dimensionScores ?? {},
      strengths: Array.isArray(json?.strengths) ? json.strengths : [],
      improvements: Array.isArray(json?.improvements) ? json.improvements : [],
      confidence: Number(json?.confidence),
      usage: json.__usage,
    };
    this.validateDraft(draft);
    return draft;
  }

  private async callGroq(prompt: string): Promise<any> {
    const url = `${this.cfg.baseUrl ?? "https://api.groq.com/openai"}/v1/chat/completions`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.cfg.timeoutMs);

    try {
      const res = await fetch(url, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.cfg.apiKey}`,
        },
        body: JSON.stringify({
          model: this.cfg.model,
          temperature: this.cfg.temperature,
          max_tokens: this.cfg.maxTokens,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!res.ok) {
        if (res.status === 401) throw new Error("LLM_API_KEY_INVALID");
        if (res.status === 404) throw new Error("LLM_MODEL_NOT_FOUND");
        throw new Error(`LLM_PROVIDER_HTTP_${res.status}`);
      }

      const payload = await res.json();
      const content = payload?.choices?.[0]?.message?.content;
      if (typeof content !== "string") throw new Error("LLM_EMPTY_RESPONSE");

      const parsed = this.parseJsonFromContent(content);
      parsed.__usage = {
        inputTokens: payload?.usage?.prompt_tokens,
        outputTokens: payload?.usage?.completion_tokens,
        totalTokens: payload?.usage?.total_tokens,
        rawModel: payload?.model,
        rawProvider: "groq",
      } satisfies LlmUsage;

      return parsed;
    } finally {
      clearTimeout(timeout);
    }
  }

  private parseJsonFromContent(content: string): any {
    try {
      return JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("LLM_INVALID_JSON");
      try {
        return JSON.parse(match[0]);
      } catch {
        throw new Error("LLM_INVALID_JSON");
      }
    }
  }

  private validateDraft(draft: LlmEvaluationDraft): void {
    if (!Number.isFinite(draft.score) || draft.score < 0 || draft.score > 100) {
      throw new Error("LLM_INVALID_SCORE");
    }
    if (!Number.isFinite(draft.confidence) || draft.confidence < 0 || draft.confidence > 1) {
      throw new Error("LLM_INVALID_CONFIDENCE");
    }
    if (!draft.dimensionScores || typeof draft.dimensionScores !== "object") {
      throw new Error("LLM_INVALID_DIMENSION_SCORES");
    }
  }

  private assertApiKey(): void {
    if (!this.cfg.apiKey) throw new Error("LLM_API_KEY_MISSING");
  }
}
