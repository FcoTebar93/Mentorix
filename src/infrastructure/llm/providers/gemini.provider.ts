import type {
    EvaluateAnswerInput,
    GenerateQuestionInput,
    ILlmService,
    LlmEvaluationDraft,
    LlmUsage,
} from "../../../application/ports/services.js";
  
type GeminiConfig = {
    apiKey?: string;
    baseUrl?: string;
    model: string;
    temperature: number;
    maxTokens: number;
    timeoutMs: number;
};
  
export class GeminiProvider implements ILlmService {
    constructor(private readonly cfg: GeminiConfig) {}
  
    async generateQuestion(input: GenerateQuestionInput): Promise<{ text: string; usage?: LlmUsage }> {
      const prompt = [
        "Generate one interview question.",
        input.prompt ? `Interview Prompt: ${input.prompt}` : "",
        `Role=${input.role}, Level=${input.level}, Language=${input.language}`,
        `Previous=${JSON.stringify(input.previousQuestions)}`,
        'Return ONLY JSON: {"text":"..."}',
      ].join("\n");
  
      const json = await this.callGemini(prompt);
      return { text: json.text, usage: json.__usage };
    }
  
    async evaluateAnswer(input: EvaluateAnswerInput): Promise<LlmEvaluationDraft> {
      const prompt = [
        "Evaluate interview answer.",
        `Question: ${input.question}`,
        `Answer: ${input.answer.text}`,
        `Rubric: ${JSON.stringify(input.rubric.dimensions)}`,
        'Return ONLY JSON with {score, dimensionScores, strengths, improvements, confidence}',
      ].join("\n");
  
      const json = await this.callGemini(prompt);
  
      return {
        score: Number(json.score),
        dimensionScores: json.dimensionScores ?? {},
        strengths: Array.isArray(json.strengths) ? json.strengths : [],
        improvements: Array.isArray(json.improvements) ? json.improvements : [],
        confidence: Number(json.confidence),
        usage: json.__usage,
      };
    }
  
    private async callGemini(prompt: string): Promise<any> {
      if (!this.cfg.apiKey) throw new Error("LLM_API_KEY_MISSING");
  
      const base = this.cfg.baseUrl ?? "https://generativelanguage.googleapis.com";
      const url = `${base}/v1beta/models/${this.cfg.model}:generateContent?key=${this.cfg.apiKey}`;
  
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.cfg.timeoutMs);
  
      try {
        const res = await fetch(url, {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: this.cfg.temperature,
              maxOutputTokens: this.cfg.maxTokens,
            },
          }),
        });
  
        if (!res.ok) throw new Error(`LLM_PROVIDER_HTTP_${res.status}`);
  
        const payload = await res.json();
        const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (typeof text !== "string") throw new Error("LLM_EMPTY_RESPONSE");
  
        const parsed = JSON.parse(text);
        parsed.__usage = {
          inputTokens: payload?.usageMetadata?.promptTokenCount,
          outputTokens: payload?.usageMetadata?.candidatesTokenCount,
          totalTokens: payload?.usageMetadata?.totalTokenCount,
          rawModel: this.cfg.model,
          rawProvider: "google",
        } satisfies LlmUsage;
  
        return parsed;
      } finally {
        clearTimeout(timeout);
      }
    }
}