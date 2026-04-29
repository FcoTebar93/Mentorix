import type { SessionListItem as SessionItem } from "../../lib/interview/types";
import { SessionListItem } from "./SessionListItem";

type Props = {
  sessions: SessionItem[];
  onOpenReport: (sessionId: string) => void;
  onContinue: (sessionId: string) => void;
};

function getSortableDate(session: SessionItem): number {
  const ended = session.endedAt ? Date.parse(session.endedAt) : NaN;
  if (Number.isFinite(ended)) return ended;

  const started = session.startedAt ? Date.parse(session.startedAt) : NaN;
  if (Number.isFinite(started)) return started;

  return 0;
}

export function SessionList({ sessions, onOpenReport, onContinue }: Props) {
  if (!sessions.length) {
    return <p>No hay sesiones todavía.</p>;
  }

  const sorted = [...sessions].sort((a, b) => getSortableDate(b) - getSortableDate(a));

  return (
    <section className="stack-sm">
      {sorted.map((session) => (
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