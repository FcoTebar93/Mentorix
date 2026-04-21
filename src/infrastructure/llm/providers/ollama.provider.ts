import type {
    EvaluateAnswerInput,
    GenerateQuestionInput,
    ILlmService,
    LlmEvaluationDraft,
    LlmUsage,
} from "../../../application/ports/services.js";
  
type OllamaConfig = {
    baseUrl?: string;
    model: string;
    temperature: number;
    maxTokens: number;
    timeoutMs: number;
};
  
export class OllamaProvider implements ILlmService {
    constructor(private readonly cfg: OllamaConfig) {}
  
    async generateQuestion(input: GenerateQuestionInput): Promise<{ text: string; usage?: LlmUsage }> {
      const prompt = [
        "Generate one interview question.",
        `Role=${input.role}, Level=${input.level}, Language=${input.language}`,
        'Return ONLY JSON: {"text":"..."}',
      ].join("\n");
  
      const json = await this.callOllama(prompt);
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
  
      const json = await this.callOllama(prompt);
  
      return {
        score: Number(json.score),
        dimensionScores: json.dimensionScores ?? {},
        strengths: Array.isArray(json.strengths) ? json.strengths : [],
        improvements: Array.isArray(json.improvements) ? json.improvements : [],
        confidence: Number(json.confidence),
        usage: json.__usage,
      };
    }
  
    private async callOllama(prompt: string): Promise<any> {
      const url = `${this.cfg.baseUrl ?? "http://localhost:11434"}/api/generate`;
  
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.cfg.timeoutMs);
  
      try {
        const res = await fetch(url, {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: this.cfg.model,
            prompt,
            stream: false,
            options: {
              temperature: this.cfg.temperature,
              num_predict: this.cfg.maxTokens,
            },
          }),
        });
  
        if (!res.ok) throw new Error(`LLM_PROVIDER_HTTP_${res.status}`);
        const payload = await res.json();
  
        const text = payload?.response;
        if (typeof text !== "string") throw new Error("LLM_EMPTY_RESPONSE");
  
        const parsed = JSON.parse(text);
        parsed.__usage = {
          rawModel: this.cfg.model,
          rawProvider: "ollama",
        } satisfies LlmUsage;
  
        return parsed;
      } finally {
        clearTimeout(timeout);
      }
    }
}