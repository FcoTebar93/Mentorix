import type {
  EvaluateAnswerInput,
  GenerateQuestionInput,
  ILlmService,
  LlmEvaluationDraft,
  LlmUsage,
} from "../../../application/ports/services.js";

export class MockProvider implements ILlmService {
  async generateQuestion(input: GenerateQuestionInput): Promise<{ text: string; usage?: LlmUsage }> {
    const index = input.previousQuestions.length + 1;
    return {
      text: `[MOCK] Question ${index} for ${input.role} (${input.level}, ${input.language})`,
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        rawModel: "mock",
        rawProvider: "mock",
      },
    };
  }

  async evaluateAnswer(input: EvaluateAnswerInput): Promise<LlmEvaluationDraft> {
    const score = Math.max(60, Math.min(95, (input.answer.text?.length ?? 0) + 50));
    return {
      score,
      dimensionScores: Object.fromEntries(input.rubric.dimensions.map((d) => [d.key, score])),
      strengths: ["Good structure", "Clear communication"],
      improvements: ["Add more concrete examples"],
      confidence: 0.9,
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        rawModel: "mock",
        rawProvider: "mock",
      },
    };
  }
}
