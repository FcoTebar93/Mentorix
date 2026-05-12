import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useAuth } from "../../features/auth/AuthContext";
import { getApiBaseUrl } from "../../shared/lib/config/api-url";
import { createAuthenticatedJsonRequest } from "../../shared/lib/http/authenticated-request";
import { resolveInterviewAccessToken } from "../../shared/lib/http/session-token";
import { createInterviewApi, type InterviewApi } from "../../shared/lib/api/interview-api";
import { createTemplatesApi, type TemplatesApi } from "../../shared/lib/api/templates-api";

type ApiClientsValue = {
  interviewApi: InterviewApi;
  templatesApi: TemplatesApi;
};

const ApiClientsContext = createContext<ApiClientsValue | undefined>(undefined);

type Props = {
  children: ReactNode;
};

export function ApiClientsProvider({ children }: Props) {
  const { token } = useAuth();

  const value = useMemo(() => {
    const baseUrl = getApiBaseUrl();
    const getAccessToken = () => resolveInterviewAccessToken(token);
    const request = createAuthenticatedJsonRequest(getAccessToken);
    return {
      interviewApi: createInterviewApi(request, baseUrl),
      templatesApi: createTemplatesApi(request, baseUrl),
    };
  }, [token]);

  return <ApiClientsContext.Provider value={value}>{children}</ApiClientsContext.Provider>;
}

export function useInterviewApi(): InterviewApi {
  const ctx = useContext(ApiClientsContext);
  if (!ctx) throw new Error("useInterviewApi must be used within ApiClientsProvider");
  return ctx.interviewApi;
}

export function useTemplatesApi(): TemplatesApi {
  const ctx = useContext(ApiClientsContext);
  if (!ctx) throw new Error("useTemplatesApi must be used within ApiClientsProvider");
  return ctx.templatesApi;
}
