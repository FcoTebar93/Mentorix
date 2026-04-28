import type { SessionListItem as SessionItem } from "../../lib/interview/types";
import { SessionListItem } from "./SessionListItem";

type Props = {
  sessions: SessionItem[];
  onOpenReport: (sessionId: string) => void;
  onContinue: (sessionId: string) => void;
};

export function SessionList({ sessions, onOpenReport, onContinue }: Props) {
  if (!sessions.length) {
    return <p>No hay sesiones todavía.</p>;
  }

  return (
    <section style={{ display: "grid", gap: 10 }}>
      {sessions.map((session) => (
        <SessionListItem
          key={session.id}
          session={session}
          onOpenReport={onOpenReport}
          onContinue={onContinue}
        />
      ))}
    </section>
  );
}