import { SessionList } from "./SessionList";
import type { SessionListItem } from "../../lib/interview/types";

type Props = {
  onBack: () => void;
  onOpenReport: (sessionId: string) => void;
  onContinue: (sessionId: string) => void;
};

export function SessionsPage({ onBack, onOpenReport, onContinue }: Props) {
  const sessions: SessionListItem[] = [];

  return (
    <section style={{ display: "grid", gap: 12 }}>
      <button type="button" onClick={onBack}>
        Volver
      </button>
      <h2>Sesiones</h2>
      <SessionList
        sessions={sessions}
        onOpenReport={onOpenReport}
        onContinue={onContinue}
      />
    </section>
  );
}