export type UUID = string;
export type ISODateString = string;

export type InterviewSessionStatus =
  | "IDLE"
  | "ASKING"
  | "EVALUATING"
  | "FEEDBACKING"
  | "COMPLETED"
  | "CANCELLED"
  | "FAILED";

export type ParticipantType = "authenticated" | "guest";
export type SessionEntryMode = "direct" | "shared_link";

export interface SessionParticipant {
  type: ParticipantType;
  userId?: UUID;
  guestAlias?: string;
  fingerprintHash?: string;
}

export interface SessionEntryPoint {
  mode: SessionEntryMode;
  accessLinkId?: UUID;
}

export type SessionQuestionSource = "llm" | "fixed";

export interface SessionQuestion {
  id: UUID;
  index: number;
  text: string;
  generatedByModel: string;
  source?: SessionQuestionSource;
  createdAt: ISODateString;
}

export interface SessionAnswer {
  id: UUID;
  questionId: UUID;
  source: "voice" | "text";
  text: string;
  receivedAt: ISODateString;
}

export interface SessionEvaluation {
  id: UUID;
  answerId: UUID;
  score: number;
  dimensionScores: Record<string, number>;
  strengths: string[];
  improvements: string[];
  confidence: number;
  evaluatedAt: ISODateString;
}

export interface SessionFeedback {
  id: UUID;
  answerId: UUID;
  text: string;
  generatedAt: ISODateString;
}

export interface InterviewSessionProps {
  id: UUID;
  templateId: UUID;
  ownerUserId: UUID;
  participant: SessionParticipant;
  entryPoint: SessionEntryPoint;
  status: InterviewSessionStatus;
  currentQuestionIndex: number;
  totalQuestions: number;
  questions: SessionQuestion[];
  answers: SessionAnswer[];
  evaluations: SessionEvaluation[];
  feedbackItems: SessionFeedback[];
  startedAt?: ISODateString;
  endedAt?: ISODateString;
  version: number;
}