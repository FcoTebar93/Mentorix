export function getApiBaseUrl(): string {
  return (
    import.meta.env.VITE_API_URL ??
    (typeof process !== "undefined" ? process.env.API_BASE_URL : undefined) ??
    "http://localhost:4000"
  );
}
