import { apiRequest } from "../../lib/api/client";
import type { LoginRequest, LoginResponse } from "./types";

const API_BASE_URL =
  (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_API_URL ??
  process.env.API_BASE_URL ??
  "http://localhost:4000";

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