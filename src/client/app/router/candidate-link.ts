export function promptCandidateLink(navigate: (path: string) => void): void {
  if (typeof window === "undefined") return;
  const input = window.prompt(
    "Pega aquí tu link de entrevista o el token compartido por el reclutador:"
  );
  if (!input) return;
  const trimmed = input.trim();
  if (!trimmed) return;

  try {
    const asUrl = new URL(trimmed);
    navigate(asUrl.pathname + asUrl.search);
    return;
  } catch {
    // no es URL absoluta: lo tratamos como token suelto
  }

  const token = trimmed.replace(/^\/+/, "").replace(/^interview\//, "");
  navigate(`/interview/${encodeURIComponent(token)}`);
}
