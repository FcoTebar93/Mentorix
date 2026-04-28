import type { SessionListItem as SessionItem } from "../../lib/interview/types";

type Props = {
  session: SessionItem;
  onOpenReport: (sessionId: string) => void;
  onContinue: (sessionId: string) => void;
};

export function SessionListItem({ session, onOpenReport, onContinue }: Props) {
  const isCompleted = session.status?.toLowerCase() === "completed";

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
      <div>
        <strong>Sesión:</strong> {session.id}
      </div>
      <div>
        <strong>Estado:</strong> {session.status}
      </div>
      <div>
        <strong>Progreso:</strong>{" "}
        {session.currentQuestionIndex ?? 0}/{session.totalQuestions ?? "-"}
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