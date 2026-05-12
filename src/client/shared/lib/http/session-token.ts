/**
 * Token enviado como `Authorization: Bearer <token>`.
 * Tras login, `accessToken` ya incluye el prefijo semántico `test-user:…` que espera el backend.
 *
 * Flujo candidato sin sesión: usar `VITE_INTERVIEW_FALLBACK_TOKEN` (p. ej. `test-user:u1` en local)
 * o iniciar sesión como el propietario del template.
 */
export function resolveInterviewAccessToken(
  sessionToken: string | null | undefined
): string | null {
  if (sessionToken && sessionToken.trim().length > 0) return sessionToken.trim();
  const fromEnv = import.meta.env.VITE_INTERVIEW_FALLBACK_TOKEN;
  if (typeof fromEnv === "string" && fromEnv.trim().length > 0) return fromEnv.trim();
  if (import.meta.env.DEV) return "test-user:u1";
  return null;
}
