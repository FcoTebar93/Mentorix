import type { LlmInterviewConfig, VoiceInterviewConfig } from "../../domain/interview/template/types.js";

export type LlmProvider =
  | "openai"
  | "anthropic"
  | "google"
  | "azure"
  | "ollama"
  | "custom"
  | "mock";

export interface TokenService {
  generateSecureToken(): Promise<string>;
  hash(rawToken: string): Promise<string>;
}

export interface Clock {
  nowISO(): string;
}

export interface IdGenerator {
  uuid(): string;
}

export interface LlmUsage {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    rawModel?: string;
    rawProvider?: string;
}

export interface LlmEvaluationDraft {
    score: number;
    dimensionScores: Record<string, number>;
    strengths: string[];
    improvements: string[];
    confidence: number;
    usage?: LlmUsage;
}

export interface EvaluateAnswerInput {
    question: string;
    answer: { text: string };
    rubric: { dimensions: { key: string; weight: number }[] };
    language?: string;
}

export interface GenerateQuestionInput {
    role: string;
    level: "junior" | "mid" | "senior";
    language: string;
    previousQuestions: string[];
}

export interface ILlmService {
    generateQuestion(input: GenerateQuestionInput): Promise<{ text: string; usage?: LlmUsage }>;
    evaluateAnswer(input: EvaluateAnswerInput): Promise<LlmEvaluationDraft>;
}

export interface ILlmServiceFactory {
  forTemplate(config: LlmInterviewConfig): ILlmService;
  forTemplateWithFallback?(
    config: LlmInterviewConfig,
    fallbackProviders: LlmProvider[]
  ): ILlmService;
}

export type VoiceProvider = "openai" | "custom";

export interface SttInput {
  audioBase64: string;
  locale: string;
}

export interface TtsInput {
  text: string;
  locale: string;
}

export interface ISttService {
  transcribe(input: SttInput): Promise<{ text: string }>;
}

export interface ITtsService {
  synthesize(input: TtsInput): Promise<{ audioBase64: string }>;
}

export interface ISttServiceFactory {
  forVoiceConfig(config?: VoiceInterviewConfig): ISttService;
}

export interface ITtsServiceFactory {
  forVoiceConfig(config?: VoiceInterviewConfig): ITtsService;
}