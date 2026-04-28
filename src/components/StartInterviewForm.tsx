import { useState } from "react";
import type { FormEvent } from "react";
import { interviewApi } from "../lib/api/interview";

type Props = {
  onStarted: (sessionId: string, firstQuestionId: string) => void;
};

export function StartInterviewForm({ onStarted }: Props) {
  const [rawToken, setRawToken] = useState("");
  const [guestAlias, setGuestAlias] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!rawToken.trim()) {
      setErrorMsg("El token es obligatorio");
      return;
    }

    setLoading(true);
    try {
      const res = await interviewApi.startFromLink({
        rawToken: rawToken.trim(),
        guestAlias: guestAlias.trim() || undefined,
      });

      const session = res.data;
      const firstQuestionId = session.questions?.[0]?.id;
      if (!firstQuestionId) {
        throw new Error("La sesión no trae primera pregunta");
      }

      onStarted(session.id, firstQuestionId);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error iniciando entrevista");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, maxWidth: 420 }}>
      <h2>Iniciar entrevista</h2>

      <label>
        Token
        <input
          value={rawToken}
          onChange={(e) => setRawToken(e.target.value)}
          placeholder="Pega aquí rawToken"
        />
      </label>

      <label>
        Alias (opcional)
        <input
          value={guestAlias}
          onChange={(e) => setGuestAlias(e.target.value)}
          placeholder="Ej: candidato-fran"
        />
      </label>

      <button type="submit" disabled={loading}>
        {loading ? "Iniciando..." : "Empezar"}
      </button>

      {errorMsg ? <p style={{ color: "crimson" }}>{errorMsg}</p> : null}
    </form>
  );
}