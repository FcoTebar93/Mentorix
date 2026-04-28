import { apiRequest } from "./client.js";
import type {
  ApiOk,
  CompleteTurnBody,
  CompleteTurnResult,
  InterviewSession,
  SessionReport,
  StartFromLinkBody,
} from "../interview/types.js";
import type { SessionListItem, ListSessionsQuery } from "../interview/types.js";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:4000";

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
};

