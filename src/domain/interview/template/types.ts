export type UUID = string;
export type ISODateString = string;

export type LlmProvider =
  | "openai"
  | "groq"
  | "anthropic"
  | "google"
  | "azure"
  | "ollama"
  | "custom"
  | "mock";

export interface RubricDimension {
  key: string;
  weight: number;
  description: string;
}

export interface EvaluationRubric {
  dimensions: RubricDimension[];
  passThreshold: number;
}

export interface LlmInterviewConfig {
  provider: LlmProvider;
  model: string;
  temperature: number;
  maxTokensPerTurn: number;
}

export interface VoiceInterviewConfig {
  sttProvider: string;
  ttsProvider: string;
  locale: string;
}

export type InterviewTemplateType = "dynamic" | "question_set";

export interface InterviewTemplate {
  id: UUID;
  ownerUserId: UUID;
  templateType?: InterviewTemplateType;
  title: string;
  role: string;
  level: "junior" | "mid" | "senior";
  language: string;
  totalQuestions: number;
  prompt?: string;
  questions?: string[];
  rubric: EvaluationRubric;
  llmConfig: LlmInterviewConfig;
  voiceConfig?: VoiceInterviewConfig;
  isArchived: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}