export type SessionStatusFilter =
  | "all"
  | "IDLE"
  | "ASKING"
  | "EVALUATING"
  | "FEEDBACKING"
  | "COMPLETED"
  | "CANCELLED"
  | "FAILED";

export type ApiOk<T> = {
  code: "OK";
  data: T;
};

export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};

export type RubricDimension = {
  key: string;
  weight: number;
};

export type StartFromLinkBody = {
  rawToken: string;
  guestAlias: string;
  fingerprintHash?: string;
};

export type CompleteTurnBody = {
  questionId: string;
  source: "text" | "voice";
  text: string;
  rubricDimensions: RubricDimension[];
};

export type VoiceTurnBody = {
  questionId: string;
  answerAudioBase64: string;
  locale: string;
  rubricDimensions: RubricDimension[];
};

export type InterviewQuestion = {
  id: string;
  text: string;
};

export type InterviewSession = {
  id: string;
  status: string;
  currentQuestionIndex: number;
  totalQuestions: number;
  questions: InterviewQuestion[];
};

export type CompleteTurnResult = {
  isCompleted: boolean;
  nextQuestion: InterviewQuestion | null;
};

export type VoiceTurnResult = {
  transcript: string;
  result: CompleteTurnResult;
  nextQuestionAudioBase64: string | null;
};

export type RealtimeNegotiateBody = {
  streamId: string;
  sdpOffer: string;
};

export type RealtimeNegotiateResult = {
  streamId: string;
  sdpAnswer: string;
  iceServers: Array<{ urls: string }>;
};

export type RealtimeInputBody = {
  streamId: string;
  questionId: string;
  locale: string;
  rubricDimensions: RubricDimension[];
  answerAudioBase64?: string;
  answerText?: string;
};

export type SessionReport = {
  sessionId: string;
  status: string;
  overallScore: number | null;
  evaluatedAnswers: number;
  strengths: string[];
  improvements: string[];
  startedAt?: string;
  endedAt?: string;
  dimensionAverages: Record<string, number>;
  confidenceAverage: number | null;
  recommendation: string;
};

export type SessionListItem = {
  id: string;
  status: string;
  totalQuestions?: number;
  currentQuestionIndex?: number;
  startedAt?: string | null;
  endedAt?: string | null;
};

export type ListSessionsQuery = {
  status?: string;
  limit?: number;
};