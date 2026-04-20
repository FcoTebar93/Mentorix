import {
    EvaluateAnswerInput,
    GenerateQuestionInput,
    ILlmService,
    LlmEvaluationDraft,
    LlmUsage,
} from "../../../application/ports/services";
  
type CustomHttpConfig = {
    apiKey?: string;
    baseUrl?: string;
    model: string;
    temperature: number;
    maxTokens: number;
    timeoutMs: number;
};
  
type CustomHttpRequest = {
    task: "generate_question" | "evaluate_answer";
    model: string;
    temperature: number;
    maxTokens: number;
    payload: unknown;
};
  
type CustomHttpResponse<T> = {
    data: T;
    usage?: LlmUsage;
};
  
export class CustomProvider implements ILlmService {
    constructor(private readonly cfg: CustomHttpConfig) {}
  
    async generateQuestion(input: GenerateQuestionInput): Promise<{ text: string; usage?: LlmUsage }> {
      const response = await this.callCustom<{ text: string }>({
        task: "generate_question",
        model: this.cfg.model,
        temperature: this.cfg.temperature,
        maxTokens: this.cfg.maxTokens,
        payload: input,
      });
  
      if (!response.data?.text || typeof response.data.text !== "string") {
        throw new Error("LLM_INVALID_QUESTION_PAYLOAD");
      }
  
      return {
        text: response.data.text,
        usage: response.usage,
      };
    }
  
    async evaluateAnswer(input: EvaluateAnswerInput): Promise<LlmEvaluationDraft> {
      const response = await this.callCustom<LlmEvaluationDraft>({
        task: "evaluate_answer",
        model: this.cfg.model,
        temperature: this.cfg.temperature,
        maxTokens: this.cfg.maxTokens,
        payload: input,
      });
  
      const draft: LlmEvaluationDraft = {
        score: Number(response.data?.score),
        dimensionScores: response.data?.dimensionScores ?? {},
        strengths: Array.isArray(response.data?.strengths) ? response.data.strengths : [],
        improvements: Array.isArray(response.data?.improvements) ? response.data.improvements : [],
        confidence: Number(response.data?.confidence),
        usage: response.usage,
      };
  
      this.validateDraft(draft);
      return draft;
    }
  
    private async callCustom<T>(body: CustomHttpRequest): Promise<CustomHttpResponse<T>> {
      if (!this.cfg.baseUrl) throw new Error("LLM_BASE_URL_MISSING");
  
      const url = `${this.cfg.baseUrl.replace(/\/+$/, "")}/v1/llm`;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
  
      if (this.cfg.apiKey) {
        headers.Authorization = `Bearer ${this.cfg.apiKey}`;
      }
  
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.cfg.timeoutMs);
  
      try {
        const res = await fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal: controller.signal,
        });
  
        if (!res.ok) {
          throw new Error(`LLM_PROVIDER_HTTP_${res.status}`);
        }
  
        const json = (await res.json()) as CustomHttpResponse<T>;
        if (!json || typeof json !== "object" || !("data" in json)) {
          throw new Error("LLM_INVALID_RESPONSE_SHAPE");
        }
  
        return json;
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
}