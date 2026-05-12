import type { JsonRequestFn } from "../http/authenticated-request.js";
import type {
  AccessLink,
  CreateAccessLinkInput,
  CreateTemplateInput,
  InterviewTemplate,
  UpdateTemplateInput,
} from "../../../features/templates/types.js";

type ApiOk<T> = { code: "OK"; data: T };

export type TemplatesApi = ReturnType<typeof createTemplatesApi>;

export function createTemplatesApi(request: JsonRequestFn, baseUrl: string) {
  const root = baseUrl.replace(/\/$/, "");

  return {
    list() {
      return request<ApiOk<InterviewTemplate[]>>(`${root}/v1/templates`, {
        method: "GET",
      });
    },

    getById(templateId: string) {
      return request<ApiOk<InterviewTemplate>>(`${root}/v1/templates/${templateId}`, {
        method: "GET",
      });
    },

    create(body: CreateTemplateInput) {
      return request<ApiOk<InterviewTemplate>>(`${root}/v1/templates`, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },

    update(templateId: string, body: UpdateTemplateInput) {
      return request<ApiOk<InterviewTemplate>>(`${root}/v1/templates/${templateId}`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
    },

    remove(templateId: string) {
      return request<ApiOk<{ id: string }>>(`${root}/v1/templates/${templateId}`, {
        method: "DELETE",
      });
    },

    createAccessLink(templateId: string, body: CreateAccessLinkInput) {
      return request<ApiOk<AccessLink>>(`${root}/v1/templates/${templateId}/access-links`, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },

    listAccessLinks(templateId: string) {
      return request<ApiOk<AccessLink[]>>(`${root}/v1/templates/${templateId}/access-links`, {
        method: "GET",
      });
    },

    revokeAccessLink(linkId: string) {
      return request<ApiOk<AccessLink>>(`${root}/v1/access-links/${linkId}/revoke`, {
        method: "POST",
      });
    },
  };
}
