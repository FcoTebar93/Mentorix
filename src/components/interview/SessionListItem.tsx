import type React from "react";
import type { SessionListItem as SessionItem } from "../../lib/interview/types";

type Props = {
  session: SessionItem;
  onOpenReport: (sessionId: string) => void;
  onContinue: (sessionId: string) => void;
};

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function statusBadgeStyle(status: string): React.CSSProperties {
  const normalized = status.toUpperCase();

  if (normalized === "COMPLETED") {
    return { background: "#dcfce7", color: "#166534", border: "1px solid #86efac" };
  }
  if (normalized === "FAILED" || normalized === "CANCELLED") {
    return { background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" };
  }
  return { background: "#dbeafe", color: "#1e3a8a", border: "1px solid #93c5fd" };
}

export function SessionListItem({ session, onOpenReport, onContinue }: Props) {
  const isCompleted = session.status?.toUpperCase() === "COMPLETED";

  return (
    <article
      style={{
        border: "1px solid #ddd",
        borderRadius: 8,
        padding: 12,
        display: "grid",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
        <strong>Sesión: {session.id}</strong>
        <span
          style={{
            ...statusBadgeStyle(session.status),
            borderRadius: 999,
            padding: "2px 10px",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {session.status}
        </span>
      </div>

      <div>
        <strong>Progreso:</strong> {session.currentQuestionIndex ?? 0}/{session.totalQuestions ?? "-"}
      </div>

      <div>
        <strong>Inicio:</strong> {formatDate(session.startedAt)}
      </div>

      <div>
        <strong>Fin:</strong> {formatDate(session.endedAt)}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        {isCompleted ? (
          <button type="button" onClick={() => onOpenReport(session.id)}>
            Ver reporte
          </button>
        ) : (
          <button type="button" onClick={() => onContinue(session.id)}>
            Continuar
          </button>
        )}
      </div>
    </article>
  );
}