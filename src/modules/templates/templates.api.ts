import { apiRequest } from "../../lib/api/client";
import type {
  AccessLink,
  CreateAccessLinkInput,
  CreateTemplateInput,
  InterviewTemplate,
  UpdateTemplateInput,
} from "./types";

const API_BASE_URL =
  (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_API_URL ??
  process.env.API_BASE_URL ??
  "http://localhost:4000";

const AUTH_HEADER = { Authorization: "Bearer test-user:u1" }; // temporal

type ApiOk<T> = { code: "OK"; data: T };

export const templatesApi = {
  list() {
    return apiRequest<ApiOk<InterviewTemplate[]>>(`${API_BASE_URL}/v1/templates`, {
      method: "GET",
      headers: AUTH_HEADER,
    });
  },

  getById(templateId: string) {
    return apiRequest<ApiOk<InterviewTemplate>>(`${API_BASE_URL}/v1/templates/${templateId}`, {
      method: "GET",
      headers: AUTH_HEADER,
    });
  },

  create(body: CreateTemplateInput) {
    return apiRequest<ApiOk<InterviewTemplate>>(`${API_BASE_URL}/v1/templates`, {
      method: "POST",
      headers: AUTH_HEADER,
      body: JSON.stringify(body),
    });
  },

  update(templateId: string, body: UpdateTemplateInput) {
    return apiRequest<ApiOk<InterviewTemplate>>(`${API_BASE_URL}/v1/templates/${templateId}`, {
      method: "PUT",
      headers: AUTH_HEADER,
      body: JSON.stringify(body),
    });
  },

  remove(templateId: string) {
    return apiRequest<ApiOk<{ id: string }>>(`${API_BASE_URL}/v1/templates/${templateId}`, {
      method: "DELETE",
      headers: AUTH_HEADER,
    });
  },

  createAccessLink(templateId: string, body: CreateAccessLinkInput) {
    return apiRequest<ApiOk<AccessLink>>(`${API_BASE_URL}/v1/templates/${templateId}/access-links`, {
      method: "POST",
      headers: AUTH_HEADER,
      body: JSON.stringify(body),
    });
  },

  listAccessLinks(templateId: string) {
    return apiRequest<ApiOk<AccessLink[]>>(`${API_BASE_URL}/v1/templates/${templateId}/access-links`, {
      method: "GET",
      headers: AUTH_HEADER,
    });
  },

  revokeAccessLink(linkId: string) {
    return apiRequest<ApiOk<AccessLink>>(`${API_BASE_URL}/v1/access-links/${linkId}/revoke`, {
      method: "POST",
      headers: AUTH_HEADER,
    });
  },
};