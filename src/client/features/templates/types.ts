export type TemplateLevel = "junior" | "mid" | "senior";
export type TemplateType = "dynamic" | "question_set";
export type InterviewMode = "text" | "voice";

export type RubricDimension = {
  key: string;
  weight: number;
  description: string;
};

export type InterviewTemplate = {
  id: string;
  ownerUserId: string;
  templateType: TemplateType;
  interviewMode?: InterviewMode;
  title: string;
  role: string;
  level: TemplateLevel;
  language: string;
  totalQuestions: number;
  prompt: string;
  questions: string[];
  rubric: {
    dimensions: RubricDimension[];
    passThreshold: number;
  };
  llmConfig: {
    provider: "openai" | "groq" | "anthropic" | "google" | "azure" | "ollama" | "custom" | "mock";
    model: string;
    temperature: number;
    maxTokensPerTurn: number;
  };
  voiceConfig?: {
    sttProvider: string;
    ttsProvider: string;
    locale: string;
  };
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
};

type TemplateBaseInput = {
  interviewMode?: InterviewMode;
  title: string;
  role: string;
  level: TemplateLevel;
  language: string;
  rubric: {
    dimensions: RubricDimension[];
    passThreshold: number;
  };
  voiceConfig?: InterviewTemplate["voiceConfig"];
};

export type CreateTemplateInput =
  | (TemplateBaseInput & {
      templateType: "dynamic";
      totalQuestions: number;
      prompt: string;
    })
  | (TemplateBaseInput & {
      templateType: "question_set";
      totalQuestions: number;
      questions: string[];
    });

export type UpdateTemplateInput = Partial<TemplateBaseInput> & {
  templateType?: TemplateType;
  totalQuestions?: number;
  prompt?: string;
  questions?: string[];
};

export type AccessLink = {
  id: string;
  templateId: string;
  ownerUserId: string;
  status: "active" | "revoked" | "expired" | string;
  maxUses?: number;
  usedCount: number;
  expiresAt?: string;
  createdAt: string;
  revokedAt?: string;
  rawToken?: string;
  accessUrl?: string;
};

export type CreateAccessLinkInput = {
  maxUses?: number;
  expiresAt?: string;
};