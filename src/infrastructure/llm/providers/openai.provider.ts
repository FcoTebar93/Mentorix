import type {
    EvaluateAnswerInput,
    GenerateQuestionInput,
    ILlmService,
    LlmEvaluationDraft,
    LlmUsage,
    QuestionSimilarityInput,
    QuestionSimilarityResult,
} from "../../../application/ports/services.js";
  
type OpenAiConfig = {
    apiKey?: string;
    baseUrl?: string;
    model: string;
    temperature: number;
    maxTokens: number;
    timeoutMs: number;
};
  
export class OpenAiProvider implements ILlmService {
    constructor(private readonly cfg: OpenAiConfig) {}
  
    async generateQuestion(input: GenerateQuestionInput): Promise<{ text: string; usage?: LlmUsage }> {
      this.assertApiKey();
  
      const prompt = [
        "You are a technical interviewer.",
        "Ask exactly one concise next interview question.",
        "Do not provide feedback, explanations, praise, or commentary.",
        "The next question must be materially different from every previous or rejected question.",
        "Treat questions about the same core topic, subsystem, tradeoff, or competency as duplicates even if the wording changes.",
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
  
      const json = await this.callOpenAi(prompt);
      const text = json?.text;
      if (typeof text !== "string" || !text.trim()) {
        throw new Error("LLM_INVALID_QUESTION_PAYLOAD");
      }
  
      return {
        text,
        usage: json.__usage,
      };
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

      const json = await this.callOpenAi(prompt);
      const overlapScore = Number(json?.overlapScore);
      return {
        isTooSimilar: Boolean(json?.isTooSimilar),
        matchedQuestion:
          typeof json?.matchedQuestion === "string" && json.matchedQuestion.trim()
            ? json.matchedQuestion.trim()
            : undefined,
        reason: typeof json?.reason === "string" ? json.reason : undefined,
        overlapScore:
          Number.isFinite(overlapScore) && overlapScore >= 0
            ? Math.min(1, Math.max(0, overlapScore))
            : undefined,
      };
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
        "Rules: score 0..100, each dimensionScores value 0..100 (same scale as score), confidence 0..1.",
      ].join("\n");
  
      const json = await this.callOpenAi(prompt);
  
      const draft: LlmEvaluationDraft = {
        score: Number(json?.score),
        dimensionScores: (json?.dimensionScores as Record<string, number> | undefined) ?? {},
        strengths: Array.isArray(json?.strengths) ? json.strengths : [],
        improvements: Array.isArray(json?.improvements) ? json.improvements : [],
        confidence: Number(json?.confidence),
        usage: json.__usage,
      };
  
      this.validateDraft(draft);
      return draft;
    }
  
    private async callOpenAi(prompt: string): Promise<Record<string, unknown> & { __usage: LlmUsage }> {
      const url = `${this.cfg.baseUrl ?? "https://api.openai.com"}/v1/chat/completions`;
  
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
            response_format: { type: "json_object" },
            messages: [{ role: "user", content: prompt }],
          }),
        });
  
        if (!res.ok) {
          throw new Error(`LLM_PROVIDER_HTTP_${res.status}`);
        }
  
        const payload = await res.json();
        const content = payload?.choices?.[0]?.message?.content;
        if (typeof content !== "string") throw new Error("LLM_EMPTY_RESPONSE");
  
        let parsed: unknown;
        try {
          parsed = JSON.parse(content);
        } catch {
          throw new Error("LLM_INVALID_JSON");
        }

        if (!parsed || typeof parsed !== "object") throw new Error("LLM_INVALID_JSON");
        const draft = parsed as Record<string, unknown> & { __usage?: LlmUsage };
        draft.__usage = {
          inputTokens: payload?.usage?.prompt_tokens,
          outputTokens: payload?.usage?.completion_tokens,
          totalTokens: payload?.usage?.total_tokens,
          rawModel: payload?.model,
          rawProvider: "openai",
        } satisfies LlmUsage;

        return draft as Record<string, unknown> & { __usage: LlmUsage };
      } finally {
        clearTimeout(timeout);
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