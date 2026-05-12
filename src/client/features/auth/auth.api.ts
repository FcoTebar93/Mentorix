import { apiRequest } from "../../../lib/api/client";
import { getApiBaseUrl } from "../../shared/lib/config/api-url";
import type { LoginRequest, LoginResponse } from "./types";

const API_BASE_URL = getApiBaseUrl();

export const authApi = {
  login(body: LoginRequest) {
    return apiRequest<LoginResponse>(`${API_BASE_URL}/v1/auth/login`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  me(token: string) {
    return apiRequest<{ user: LoginResponse["user"] }>(`${API_BASE_URL}/v1/auth/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};