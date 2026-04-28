import { useEffect, useState } from "react";
import { interviewApi } from "../../lib/api/interview";
import type { SessionListItem, SessionStatusFilter } from "../../lib/interview/types";
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
  const [filter, setFilter] = useState<SessionStatusFilter>("all");

  useEffect(() => {
    let active = true;

    async function loadSessions() {
      setLoading(true);
      setErrorMsg(null);

      try {
        const status = filter === "all" ? undefined : filter;
        const res = await interviewApi.listSessions({ status, limit: 20 });
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
  }, [filter]);

  return (
    <section style={{ display: "grid", gap: 12 }}>
      <button type="button" onClick={onBack}>
        Volver
      </button>

      <h2>Sesiones</h2>

      <label style={{ display: "grid", gap: 6, maxWidth: 240 }}>
        Estado
        <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as SessionStatusFilter)}
        >
            <option value="ASKING">En curso (ASKING)</option>
            <option value="EVALUATING">Evaluando</option>
            <option value="FEEDBACKING">Generando feedback</option>
            <option value="COMPLETED">Completada</option>
            <option value="FAILED">Fallida</option>
            <option value="CANCELLED">Cancelada</option>
        </select>
      </label>

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