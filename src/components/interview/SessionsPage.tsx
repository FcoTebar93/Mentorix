import { useEffect, useState } from "react";
import { interviewApi } from "../../lib/api/interview";
import type { SessionListItem } from "../../lib/interview/types";
import { SessionList } from "./SessionList";

type Props = {
  onBack: () => void;
  onOpenReport: (sessionId: string) => void;
  onContinue: (sessionId: string) => void;
};

export function SessionsPage({ onBack, onOpenReport, onContinue }: Props) {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadSessions() {
      setLoading(true);
      setErrorMsg(null);

      try {
        const res = await interviewApi.listSessions({ limit: 20 });
        if (!active) return;
        setSessions(res.data ?? []);
      } catch (err) {
        if (!active) return;
        setErrorMsg(err instanceof Error ? err.message : "No se pudieron cargar las sesiones");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSessions();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section style={{ display: "grid", gap: 12 }}>
      <button type="button" onClick={onBack}>
        Volver
      </button>

      <h2>Sesiones</h2>

      {loading ? <p>Cargando sesiones...</p> : null}
      {errorMsg ? <p style={{ color: "crimson" }}>{errorMsg}</p> : null}

      {!loading && !errorMsg ? (
        <SessionList
          sessions={sessions}
          onOpenReport={onOpenReport}
          onContinue={onContinue}
        />
      ) : null}
    </section>
  );
}