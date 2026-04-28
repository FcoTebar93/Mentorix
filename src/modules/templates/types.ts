export type TemplateLevel = "junior" | "mid" | "senior";

export type RubricDimension = {
  key: string;
  weight: number;
  description: string;
};

export type InterviewTemplate = {
  id: string;
  ownerUserId: string;
  title: string;
  role: string;
  level: TemplateLevel;
  language: string;
  totalQuestions: number;
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
  "id" | "ownerUserId" | "isArchived" | "createdAt" | "updatedAt"
>;

export type UpdateTemplateInput = Partial<CreateTemplateInput>;