import type {
  EvaluateAnswerInput,
  GenerateQuestionInput,
  ILlmService,
  LlmEvaluationDraft,
  LlmUsage,
  QuestionSimilarityInput,
  QuestionSimilarityResult,
} from "../../../application/ports/services.js";
import { extractSpokenQuestion } from "../../../application/voice/spoken-question.js";

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
      "You are a technical interviewer.",
      "Your job is to ask exactly one concise next interview question.",
      "Do not provide feedback, evaluation, hints, praise, explanations, summaries, transitions, or commentary.",
      "Do not answer for the candidate.",
      "The next question must be materially different from every previous or rejected question.",
      "Treat questions about the same core topic, subsystem, tradeoff, or competency as duplicates even if the wording changes.",
      "Change the topic or angle clearly when previous questions already covered something similar.",
      "Return a single question in the requested language, ideally under 220 characters.",
      "The output must contain only the next question text.",
      input.prompt ? `Interview Prompt: ${input.prompt}` : "",
      `Role: ${input.role}`,
      `Level: ${input.level}`,
      `Language: ${input.language}`,
      `Previous: ${JSON.stringify(input.previousQuestions)}`,
      input.rejectedQuestions?.length
        ? `Rejected for similarity: ${JSON.stringify(input.rejectedQuestions)}`
        : "",
      'Return ONLY JSON: {"text":"..."}',
    ].join("\n");

    const json = await this.callGroq(prompt);
    const text = json?.text;
    if (typeof text !== "string" || !text.trim()) {
      throw new Error("LLM_INVALID_QUESTION_PAYLOAD");
    }
    const normalized = this.normalizeQuestionText(text);
    if (!normalized) {
      throw new Error("LLM_INVALID_QUESTION_PAYLOAD");
    }
    return { text: normalized, usage: json.__usage };
  }

  async judgeQuestionSimilarity(
    input: QuestionSimilarityInput
  ): Promise<QuestionSimilarityResult> {
    this.assertApiKey();

    const prompt = [
      "You are checking whether a candidate interview question is too similar to previously asked questions.",
      "Mark isTooSimilar=true when the candidate repeats the same core topic, subsystem, competency, architectural concern, or tradeoff, even if the wording is different.",
      "Be strict: follow-up variants that only rephrase the same idea should count as too similar.",
      input.prompt ? `Interview Prompt: ${input.prompt}` : "",
      `Role: ${input.role}`,
      `Level: ${input.level}`,
      `Language: ${input.language}`,
      `Candidate Question: ${input.candidateQuestion}`,
      `Previous Questions: ${JSON.stringify(input.previousQuestions)}`,
      "Return ONLY JSON:",
      '{"isTooSimilar": boolean, "matchedQuestion": string | null, "reason": string, "overlapScore": number}',
      "Rules: overlapScore 0..1.",
    ].join("\n");

    const json = await this.callGroq(prompt);
    return this.normalizeSimilarityResult(json);
  }

  async evaluateAnswer(input: EvaluateAnswerInput): Promise<LlmEvaluationDraft> {
    this.assertApiKey();

    const prompt = [
      "You evaluate interview answers strictly.",
      "Use only evidence explicitly stated in the answer.",
      "Do not infer experience, tools, architecture decisions, or knowledge the candidate did not mention.",
      "If the answer is vague, short, generic, or off-topic, assign a low score.",
      "Do not reward plausible but unstated details.",
      "Only mention strengths that are directly supported by the answer text.",
      "If there is not enough evidence, strengths can be an empty array.",
      "Dimension scores must use only the rubric keys provided.",
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

      const raw = this.parseJsonFromContent(content);
      if (!raw || typeof raw !== "object") throw new Error("LLM_INVALID_JSON");
      const parsed = raw as LlmEvaluationDraft & { __usage?: LlmUsage };
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

  private parseJsonFromContent(content: string): unknown {
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

  private normalizeQuestionText(text: string): string {
    const compact = text.replace(/\s+/g, " ").trim();
    if (!compact) return "";
    const spoken = extractSpokenQuestion(compact);
    return (spoken || compact).replace(/\s+/g, " ").trim();
  }

  private normalizeSimilarityResult(value: any): QuestionSimilarityResult {
    const overlapScore = Number(value?.overlapScore);
    return {
      isTooSimilar: Boolean(value?.isTooSimilar),
      matchedQuestion:
        typeof value?.matchedQuestion === "string" && value.matchedQuestion.trim()
          ? value.matchedQuestion.trim()
          : undefined,
      reason: typeof value?.reason === "string" ? value.reason : undefined,
      overlapScore:
        Number.isFinite(overlapScore) && overlapScore >= 0
          ? Math.min(1, Math.max(0, overlapScore))
          : undefined,
    };
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
