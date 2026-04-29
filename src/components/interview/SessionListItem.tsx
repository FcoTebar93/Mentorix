import type { SessionListItem as SessionItem } from "../../lib/interview/types";

type Props = {
  session: SessionItem;
  onOpenReport: (sessionId: string) => void;
  onContinue: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
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

function statusBadgeClass(status: string): string {
  const normalized = status.toUpperCase();

  if (normalized === "COMPLETED") {
    return "session-badge session-badge-completed";
  }
  if (normalized === "FAILED" || normalized === "CANCELLED") {
    return "session-badge session-badge-failed";
  }
  return "session-badge session-badge-progress";
}

export function SessionListItem({ session, onOpenReport, onContinue, onDelete }: Props) {
  const isCompleted = session.status?.toUpperCase() === "COMPLETED";

  return (
    <article className="session-item">
      <div className="session-item-header">
        <strong>Sesión: {session.id}</strong>
        <span className={statusBadgeClass(session.status)}>
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

      <div className="row-actions">
        {isCompleted ? (
          <button type="button" onClick={() => onOpenReport(session.id)}>
            Ver reporte
          </button>
        ) : (
          <button type="button" onClick={() => onContinue(session.id)}>
            Continuar
          </button>
        )}
        <button type="button" className="btn-ghost" onClick={() => onDelete(session.id)}>
          Eliminar
        </button>
      </div>
    </article>
  );
}