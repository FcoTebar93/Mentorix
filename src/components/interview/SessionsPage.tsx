import { useEffect, useState } from "react";
import { interviewApi } from "../../lib/api/interview";
import type {
  SessionListItem,
  SessionStatusFilter,
} from "../../lib/interview/types";
import { SessionList } from "./SessionList";

type Props = {
  onBack: () => void;
  onOpenReport: (sessionId: string) => void;
  onContinue: (sessionId: string) => void;
};

const PAGE_SIZE = 10;

export function SessionsPage({ onBack, onOpenReport, onContinue }: Props) {
  const [allSessions, setAllSessions] = useState<SessionListItem[]>([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
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
        // Pedimos un bloque mayor y paginamos en UI
        const res = await interviewApi.listSessions({ status, limit: 100 });
        if (!active) return;
        setAllSessions(res.data ?? []);
        setVisibleCount(PAGE_SIZE);
      } catch (err) {
        if (!active) return;
        setErrorMsg(
          err instanceof Error ? err.message : "No se pudieron cargar las sesiones"
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSessions();
    return () => {
      active = false;
    };
  }, [filter]);

  const visibleSessions = allSessions.slice(0, visibleCount);
  const canLoadMore = visibleCount < allSessions.length;

  return (
    <section style={{ display: "grid", gap: 12 }}>
      <button type="button" onClick={onBack}>
        Volver
      </button>

      <h2>Sesiones</h2>

      <label style={{ display: "grid", gap: 6, maxWidth: 260 }}>
        Estado
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as SessionStatusFilter)}
        >
          <option value="all">Todas</option>
          <option value="IDLE">IDLE</option>
          <option value="ASKING">ASKING</option>
          <option value="EVALUATING">EVALUATING</option>
          <option value="FEEDBACKING">FEEDBACKING</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="CANCELLED">CANCELLED</option>
          <option value="FAILED">FAILED</option>
        </select>
      </label>

      {loading ? <p>Cargando sesiones...</p> : null}
      {errorMsg ? <p style={{ color: "crimson" }}>{errorMsg}</p> : null}

      {!loading && !errorMsg ? (
        <>
          <SessionList
            sessions={visibleSessions}
            onOpenReport={onOpenReport}
            onContinue={onContinue}
          />

          {canLoadMore ? (
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
            >
              Cargar más ({visibleCount}/{allSessions.length})
            </button>
          ) : null}
        </>
      ) : null}
    </section>
  );
}