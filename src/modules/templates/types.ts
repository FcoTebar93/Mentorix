export type TemplateLevel = "junior" | "mid" | "senior";
export type TemplateType = "dynamic" | "question_set";

export type RubricDimension = {
  key: string;
  weight: number;
  description: string;
};

export type InterviewTemplate = {
  id: string;
  ownerUserId: string;
  templateType: TemplateType;
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
    provider: "openai" | "anthropic" | "google" | "azure" | "ollama" | "custom" | "mock";
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

export type CreateTemplateInput = Omit<
  InterviewTemplate,
  "id" | "ownerUserId" | "isArchived" | "createdAt" | "updatedAt" | "llmConfig"
>;

export type UpdateTemplateInput = Partial<CreateTemplateInput>;

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