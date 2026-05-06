import { apiRequest } from "./client.js";
import type {
  ApiOk,
  CompleteTurnBody,
  CompleteTurnResult,
  InterviewSession,
  SessionReport,
  StartFromLinkBody,
  VoiceTurnBody,
  VoiceTurnResult,
  RealtimeNegotiateBody,
  RealtimeNegotiateResult,
  RealtimeInputBody,
} from "../interview/types.js";
import type { SessionListItem, ListSessionsQuery } from "../interview/types.js";

const API_BASE_URL =
  (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_API_URL ??
  (typeof process !== "undefined" ? process.env?.API_BASE_URL : undefined) ??
  "http://localhost:4000";

const AUTH_HEADER = { Authorization: "Bearer test-user:u1" };

export const interviewApi = {
  startFromLink(body: StartFromLinkBody) {
    return apiRequest<ApiOk<InterviewSession>>(
      `${API_BASE_URL}/v1/interview-sessions/from-link`,
      {
        method: "POST",
        headers: AUTH_HEADER,
        body: JSON.stringify(body),
      }
    );
  },

  completeTurn(sessionId: string, body: CompleteTurnBody) {
    return apiRequest<ApiOk<CompleteTurnResult>>(
      `${API_BASE_URL}/v1/interview-sessions/${sessionId}/turn`,
      {
        method: "POST",
        headers: AUTH_HEADER,
        body: JSON.stringify(body),
      }
    );
  },

  voiceTurn(sessionId: string, body: VoiceTurnBody) {
    return apiRequest<ApiOk<VoiceTurnResult>>(
      `${API_BASE_URL}/v1/interview-sessions/${sessionId}/voice-turn`,
      {
        method: "POST",
        headers: AUTH_HEADER,
        body: JSON.stringify(body),
      }
    );
  },
  negotiateRealtime(sessionId: string, body: RealtimeNegotiateBody) {
    return apiRequest<ApiOk<RealtimeNegotiateResult>>(
      `${API_BASE_URL}/v1/realtime/sessions/${sessionId}/negotiate`,
      {
        method: "POST",
        headers: AUTH_HEADER,
        body: JSON.stringify(body),
      }
    );
  },
  submitRealtimeInput(sessionId: string, body: RealtimeInputBody) {
    return apiRequest<ApiOk<{ accepted: boolean; streamId: string }>>(
      `${API_BASE_URL}/v1/realtime/sessions/${sessionId}/input`,
      {
        method: "POST",
        headers: AUTH_HEADER,
        body: JSON.stringify(body),
      }
    );
  },
  createRealtimeEventSource(sessionId: string, streamId: string) {
    return new EventSource(
      `${API_BASE_URL}/v1/realtime/sessions/${sessionId}/events?streamId=${encodeURIComponent(streamId)}`,
      { withCredentials: false }
    );
  },

  getReport(sessionId: string) {
    return apiRequest<ApiOk<SessionReport>>(
      `${API_BASE_URL}/v1/interview-sessions/${sessionId}/report`,
      {
        method: "GET",
        headers: AUTH_HEADER,
      }
    );
  },
  listSessions(query?: ListSessionsQuery) {
    const params = new URLSearchParams();
    if (query?.status) params.set("status", query.status);
    if (typeof query?.limit === "number") params.set("limit", String(query.limit));
  
    const qs = params.toString();
    const url = `${API_BASE_URL}/v1/interview-sessions${qs ? `?${qs}` : ""}`;
  
    return apiRequest<ApiOk<SessionListItem[]>>(url, {
      method: "GET",
      headers: AUTH_HEADER,
    });
  },
  getSession(sessionId: string) {
    return apiRequest<ApiOk<InterviewSession>>(
      `${API_BASE_URL}/v1/interview-sessions/${sessionId}`,
      {
        method: "GET",
        headers: AUTH_HEADER,
      }
    );
  },
  removeSession(sessionId: string) {
    return apiRequest<ApiOk<{ id: string }>>(
      `${API_BASE_URL}/v1/interview-sessions/${sessionId}`,
      {
        method: "DELETE",
        headers: AUTH_HEADER,
      }
    );
  },
};

