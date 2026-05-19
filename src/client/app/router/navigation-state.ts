export type InterviewSessionNavigationState = {
  questionId?: string;
  questionText?: string;
  interviewMode?: "text" | "voice";
};

export function parseInterviewSessionState(raw: unknown): InterviewSessionNavigationState {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const interviewMode = o.interviewMode;
  return {
    questionId: typeof o.questionId === "string" ? o.questionId : undefined,
    questionText: typeof o.questionText === "string" ? o.questionText : undefined,
    interviewMode:
      interviewMode === "text" || interviewMode === "voice" ? interviewMode : undefined,
  };
}

export type ReportNavigationState = {
  celebrate?: boolean;
};

export function parseReportNavigationState(raw: unknown): ReportNavigationState {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  return {
    celebrate: typeof o.celebrate === "boolean" ? o.celebrate : undefined,
  };
}
