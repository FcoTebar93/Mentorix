import type { SessionReportTurn } from "../../../lib/interview/types";
import { formatDimensionLabel } from "../../../lib/interview/report-builder";
import { formatConfidence } from "../../../lib/interview/report-scores";

type ScoreBucket = "high" | "mid" | "low" | "muted";

function bucketForScore(score: number | null): ScoreBucket {
  if (score === null) return "muted";
  if (score >= 80) return "high";
  if (score >= 60) return "mid";
  return "low";
}

type Props = {
  turn: SessionReportTurn;
};

export function ReportTurnCard({ turn }: Props) {
  const bucket = bucketForScore(turn.score);
  const dimensionEntries = Object.entries(turn.dimensionScores ?? {});
  const strengths = turn.strengths ?? [];
  const improvements = turn.improvements ?? [];

  return (
    <article className="report-turn-card">
      <header className="report-turn-header">
        <h4 className="title-reset">Pregunta {turn.questionIndex}</h4>
        <section className="report-turn-score">
          <span className={`dimension-bar-score score-${bucket}`}>
            {turn.score !== null ? `${turn.score}/100` : "Sin nota"}
          </span>
          {turn.confidence !== null ? (
            <span className="message-meta">Confianza {formatConfidence(turn.confidence)}</span>
          ) : null}
        </section>
      </header>

      <section className="report-turn-block">
        <p className="report-turn-label">Pregunta</p>
        <p className="report-turn-text">{turn.questionText}</p>
      </section>

      <section className="report-turn-block">
        <p className="report-turn-label">
          Respuesta
          {turn.answerSource === "voice" ? " (voz)" : turn.answerSource === "text" ? " (texto)" : ""}
        </p>
        <p className="report-turn-text">{turn.answerText ?? "Sin respuesta registrada."}</p>
      </section>

      {dimensionEntries.length ? (
        <section className="report-turn-block">
          <p className="report-turn-label">Nota por dimensión</p>
          <section className="stack-xs">
            {dimensionEntries.map(([key, value]) => {
              const dimBucket = bucketForScore(value);
              return (
                <section key={key} className="dimension-bar-row">
                  <section className="dimension-bar-info">
                    <span className="dimension-bar-label">{formatDimensionLabel(key)}</span>
                    <section className="dimension-bar-track">
                      <span
                        className={`dimension-bar-fill is-${dimBucket}`}
                        style={{
                          width: `${value}%`,
                          position: "absolute",
                          insetBlock: 0,
                          insetInlineStart: 0,
                        }}
                      />
                    </section>
                  </section>
                  <span className={`dimension-bar-score score-${dimBucket}`}>{value}</span>
                </section>
              );
            })}
          </section>
        </section>
      ) : null}

      <section className="report-turn-columns">
        <section className="report-turn-block">
          <p className="report-turn-label">Fortalezas de esta respuesta</p>
          {strengths.length ? (
            <ul className="report-turn-list">
              {strengths.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="text-reset">—</p>
          )}
        </section>
        <section className="report-turn-block">
          <p className="report-turn-label">Aspectos a mejorar</p>
          {improvements.length ? (
            <ul className="report-turn-list">
              {improvements.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="text-reset">—</p>
          )}
        </section>
      </section>

      {turn.feedback ? (
        <section className="report-turn-block">
          <p className="report-turn-label">Feedback del entrevistador</p>
          <p className="report-turn-text">{turn.feedback}</p>
        </section>
      ) : null}
    </article>
  );
}
