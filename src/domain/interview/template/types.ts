export type UUID = string;
export type ISODateString = string;

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
  provider: string;
  model: string;
  temperature: number;
  maxTokensPerTurn: number;
}

export interface VoiceInterviewConfig {
  sttProvider: string;
  ttsProvider: string;
  locale: string;
}

export interface InterviewTemplate {
  id: UUID;
  ownerUserId: UUID;
  title: string;
  role: string;
  level: "junior" | "mid" | "senior";
  language: string;
  totalQuestions: number;
  rubric: EvaluationRubric;
  llmConfig: LlmInterviewConfig;
  voiceConfig?: VoiceInterviewConfig;
  isArchived: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}