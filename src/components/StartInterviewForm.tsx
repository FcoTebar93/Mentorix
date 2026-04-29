import { useState } from "react";
import type { FormEvent } from "react";
import { interviewApi } from "../lib/api/interview";

type Props = {
  onStarted: (sessionId: string, firstQuestionId: string) => void;
  presetToken?: string;
  showTokenField?: boolean;
};

export function StartInterviewForm({ onStarted, presetToken, showTokenField = true }: Props) {
  const [rawToken, setRawToken] = useState(presetToken ?? "");
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
    if (!guestAlias.trim()) {
      setErrorMsg("El nombre es obligatorio");
      return;
    }

    setLoading(true);
    try {
      const res = await interviewApi.startFromLink({
        rawToken: rawToken.trim(),
        guestAlias: guestAlias.trim(),
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
    <form onSubmit={onSubmit} className="form-stack form-narrow">
      <h2>Iniciar entrevista</h2>

      {showTokenField ? (
        <label>
          Token
          <input
            value={rawToken}
            onChange={(e) => setRawToken(e.target.value)}
            placeholder="Pega aquí rawToken"
          />
        </label>
      ) : null}

      <label>
        Nombre
        <input
          value={guestAlias}
          onChange={(e) => setGuestAlias(e.target.value)}
          placeholder="Ej: Fran"
          required
        />
      </label>

      <button type="submit" disabled={loading}>
        {loading ? "Iniciando..." : "Comenzar entrevista"}
      </button>

      {errorMsg ? <p className="error-text">{errorMsg}</p> : null}
    </form>
  );
}