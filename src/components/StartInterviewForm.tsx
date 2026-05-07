import { useState } from "react";
import type { FormEvent } from "react";
import { interviewApi } from "../lib/api/interview";
import { humanizeError, type HumanError } from "../lib/errors/humanize";
import { ErrorBanner } from "./ErrorBanner";

type Props = {
  onStarted: (sessionId: string, firstQuestionId: string, firstQuestionText: string) => void;
  presetToken?: string;
  showTokenField?: boolean;
};

export function StartInterviewForm({ onStarted, presetToken, showTokenField = true }: Props) {
  const [rawToken, setRawToken] = useState(presetToken ?? "");
  const [guestAlias, setGuestAlias] = useState("");
  const [loading, setLoading] = useState(false);
  const [validationMsg, setValidationMsg] = useState<string | null>(null);
  const [errorState, setErrorState] = useState<HumanError | null>(null);

  async function submit() {
    setValidationMsg(null);
    setErrorState(null);

    if (!rawToken.trim()) {
      setValidationMsg("El token es obligatorio");
      return;
    }
    if (!guestAlias.trim()) {
      setValidationMsg("El nombre es obligatorio");
      return;
    }

    setLoading(true);
    try {
      const res = await interviewApi.startFromLink({
        rawToken: rawToken.trim(),
        guestAlias: guestAlias.trim(),
      });

      const session = res.data;
      const firstQuestion = session.questions?.[0];
      if (!firstQuestion?.id) {
        throw new Error("La sesión no trae primera pregunta");
      }

      onStarted(session.id, firstQuestion.id, firstQuestion.text ?? "Pregunta actual");
    } catch (err) {
      setErrorState(humanizeError(err));
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void submit();
  }

  return (
    <form onSubmit={onSubmit} className="form-stack form-narrow start-form">
      <h2 className="start-form-title">Iniciar entrevista</h2>

      {showTokenField ? (
        <label className="start-form-field">
          <span>Token</span>
          <input
            value={rawToken}
            onChange={(e) => setRawToken(e.target.value)}
            placeholder="Pega aquí rawToken"
          />
        </label>
      ) : null}

      <label className="start-form-field">
        <span>Nombre</span>
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

      {validationMsg ? <p className="error-text">{validationMsg}</p> : null}
      {errorState ? <ErrorBanner error={errorState} onRetry={() => void submit()} /> : null}
    </form>
  );
}