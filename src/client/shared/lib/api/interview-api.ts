import type { JsonRequestFn } from "../http/authenticated-request.js";
import type {
  ApiOk,
  CompleteTurnBody,
  CompleteTurnResult,
  InterviewSession,
  SessionReport,
  StartFromLinkBody,
  TtsQuestionBody,
  TtsQuestionResult,
  VoiceTurnBody,
  VoiceTurnResult,
  RealtimeNegotiateBody,
  RealtimeNegotiateResult,
  RealtimeInputBody,
} from "../../../../lib/interview/types.js";
import type { SessionListItem, ListSessionsQuery } from "../../../../lib/interview/types.js";

export type InterviewApi = ReturnType<typeof createInterviewApi>;

export function createInterviewApi(request: JsonRequestFn, baseUrl: string) {
  const root = baseUrl.replace(/\/$/, "");

  return {
    startFromLink(body: StartFromLinkBody) {
      return request<ApiOk<InterviewSession>>(`${root}/v1/interview-sessions/from-link`, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },

    completeTurn(sessionId: string, body: CompleteTurnBody) {
      return request<ApiOk<CompleteTurnResult>>(`${root}/v1/interview-sessions/${sessionId}/turn`, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },

    voiceTurn(sessionId: string, body: VoiceTurnBody) {
      return request<ApiOk<VoiceTurnResult>>(`${root}/v1/interview-sessions/${sessionId}/voice-turn`, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },

    synthesizeQuestionAudio(body: TtsQuestionBody) {
      return request<ApiOk<TtsQuestionResult>>(`${root}/v1/voice/tts/question`, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },

    negotiateRealtime(sessionId: string, body: RealtimeNegotiateBody) {
      return request<ApiOk<RealtimeNegotiateResult>>(`${root}/v1/realtime/sessions/${sessionId}/negotiate`, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },

    submitRealtimeInput(sessionId: string, body: RealtimeInputBody) {
      return request<ApiOk<{ accepted: boolean; streamId: string }>>(
        `${root}/v1/realtime/sessions/${sessionId}/input`,
        {
          method: "POST",
          body: JSON.stringify(body),
        }
      );
    },

    createRealtimeEventSource(sessionId: string, streamId: string) {
      return new EventSource(
        `${root}/v1/realtime/sessions/${sessionId}/events?streamId=${encodeURIComponent(streamId)}`,
        { withCredentials: false }
      );
    },

    getReport(sessionId: string) {
      return request<ApiOk<SessionReport>>(`${root}/v1/interview-sessions/${sessionId}/report`, {
        method: "GET",
        cache: "no-store",
      });
    },

    listSessions(query?: ListSessionsQuery) {
      const params = new URLSearchParams();
      if (query?.status) params.set("status", query.status);
      if (typeof query?.limit === "number") params.set("limit", String(query.limit));

      const qs = params.toString();
      const url = `${root}/v1/interview-sessions${qs ? `?${qs}` : ""}`;

      return request<ApiOk<SessionListItem[]>>(url, {
        method: "GET",
      });
    },

    getSession(sessionId: string) {
      return request<ApiOk<InterviewSession>>(`${root}/v1/interview-sessions/${sessionId}`, {
        method: "GET",
      });
    },

    removeSession(sessionId: string) {
      return request<ApiOk<{ id: string }>>(`${root}/v1/interview-sessions/${sessionId}`, {
        method: "DELETE",
      });
    },
  };
}
