import {
    EvaluateAnswerInput,
    GenerateQuestionInput,
    ILlmService,
    LlmEvaluationDraft,
    LlmUsage,
} from "../../../application/ports/services";
  
type AnthropicConfig = {
    apiKey?: string;
    baseUrl?: string;
    model: string;
    temperature: number;
    maxTokens: number;
    timeoutMs: number;
};
  
export class AnthropicProvider implements ILlmService {
    constructor(private readonly cfg: AnthropicConfig) {}
  
    async generateQuestion(input: GenerateQuestionInput): Promise<{ text: string; usage?: LlmUsage }> {
      const prompt = [
        "Generate one interview question.",
        `Role: ${input.role}, Level: ${input.level}, Language: ${input.language}`,
        'Return ONLY JSON: {"text":"..."}',
      ].join("\n");
  
      const json = await this.callAnthropic(prompt);
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
  
      const json = await this.callAnthropic(prompt);
  
      return {
        score: Number(json.score),
        dimensionScores: json.dimensionScores ?? {},
        strengths: Array.isArray(json.strengths) ? json.strengths : [],
        improvements: Array.isArray(json.improvements) ? json.improvements : [],
        confidence: Number(json.confidence),
        usage: json.__usage,
      };
    }
  
    private async callAnthropic(prompt: string): Promise<any> {
      if (!this.cfg.apiKey) throw new Error("LLM_API_KEY_MISSING");
      const url = `${this.cfg.baseUrl ?? "https://api.anthropic.com"}/v1/messages`;
  
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.cfg.timeoutMs);
  
      try {
        const res = await fetch(url, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            "x-api-key": this.cfg.apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: this.cfg.model,
            temperature: this.cfg.temperature,
            max_tokens: this.cfg.maxTokens,
            messages: [{ role: "user", content: prompt }],
          }),
        });
  
        if (!res.ok) throw new Error(`LLM_PROVIDER_HTTP_${res.status}`);
  
        const payload = await res.json();
        const text = payload?.content?.[0]?.text;
        if (typeof text !== "string") throw new Error("LLM_EMPTY_RESPONSE");
  
        const parsed = JSON.parse(text);
        parsed.__usage = {
          inputTokens: payload?.usage?.input_tokens,
          outputTokens: payload?.usage?.output_tokens,
          totalTokens:
            (payload?.usage?.input_tokens ?? 0) + (payload?.usage?.output_tokens ?? 0),
          rawModel: payload?.model,
          rawProvider: "anthropic",
        } satisfies LlmUsage;
  
        return parsed;
      } finally {
        clearTimeout(timeout);
      }
    }
}