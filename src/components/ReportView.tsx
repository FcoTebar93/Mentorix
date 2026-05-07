import { useEffect, useMemo, useState } from "react";
import { interviewApi } from "../lib/api/interview";
import type { SessionReport } from "../lib/interview/types";

type Props = {
  sessionId: string;
};

type ScoreBucket = "high" | "mid" | "low" | "muted";

function formatDate(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function bucketForScore(score: number | null): ScoreBucket {
  if (score === null) return "muted";
  if (score >= 80) return "high";
  if (score >= 60) return "mid";
  return "low";
}

function classifyRecommendation(text: string, score: number | null): {
  className: string;
  icon: string;
  heading: string;
} {
  const lower = text.toLowerCase();

  if (score !== null) {
    if (score >= 80) return { className: "is-pass", icon: "✓", heading: "Recomendación: avanzar" };
    if (score < 60) return { className: "is-fail", icon: "✕", heading: "Recomendación: no avanzar" };
  }

  if (lower.includes("no recomend") || lower.includes("rechaz")) {
    return { className: "is-fail", icon: "✕", heading: "Recomendación: no avanzar" };
  }
  if (lower.includes("recomend") || lower.includes("apto")) {
    return { className: "is-pass", icon: "✓", heading: "Recomendación: avanzar" };
  }

  return { className: "is-review", icon: "•", heading: "Recomendación" };
}

export function ReportView({ sessionId }: Props) {
  const [report, setReport] = useState<SessionReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setErrorMsg(null);

      try {
        const res = await interviewApi.getReport(sessionId);
        if (!active) return;
        setReport(res.data);
      } catch (err) {
        if (!active) return;
        setErrorMsg(err instanceof Error ? err.message : "No se pudo cargar el reporte");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [sessionId]);

  const sortedDimensions = useMemo(() => {
    if (!report) return [];
    return Object.entries(report.dimensionAverages).sort((a, b) => b[1] - a[1]);
  }, [report]);

  if (loading) return <p>Cargando reporte...</p>;
  if (errorMsg) return <p className="error-text">{errorMsg}</p>;
  if (!report) return <p>No hay reporte.</p>;

  const overallBucket = bucketForScore(report.overallScore);
  const overallText = report.overallScore !== null ? String(report.overallScore) : "—";
  const recommendationStyle = classifyRecommendation(report.recommendation, report.overallScore);

  return (
    <section className="stack-lg">
      <h2>Reporte final</h2>

      <section className={`report-hero`}>
        <div className="report-hero-score">
          <span className={`report-hero-score-value score-${overallBucket}`}>{overallText}</span>
          <span className="report-hero-score-label">Score global</span>
        </div>

        <div className="report-hero-meta">
          <strong>Sesión {report.sessionId.slice(0, 8)}…</strong>
          <div className="report-hero-meta-row">
            <span>Estado: {report.status}</span>
            <span>Respuestas: {report.evaluatedAnswers}</span>
            <span>
              Confianza media: {report.confidenceAverage !== null ? report.confidenceAverage : "—"}
            </span>
          </div>
        </div>
      </section>

      <section className={`report-recommendation ${recommendationStyle.className}`}>
        <div className="report-recommendation-icon" aria-hidden="true">
          {recommendationStyle.icon}
        </div>
        <div className="report-recommendation-body">
          <h3 className="title-reset">{recommendationStyle.heading}</h3>
          <p>{report.recommendation || "Sin recomendación generada."}</p>
        </div>
      </section>

      <section className="info-card">
        <h3 className="title-reset">Promedio por dimensión</h3>

        {sortedDimensions.length ? (
          <div className="stack-xs">
            {sortedDimensions.map(([key, value]) => {
              const bucket = bucketForScore(value);
              const widthPercent = Math.max(0, Math.min(100, value));
              return (
                <div key={key} className="dimension-bar-row">
                  <div className="dimension-bar-info">
                    <span className="dimension-bar-label">{key}</span>
                    <div className="dimension-bar-track">
                      <div
                        className={`dimension-bar-fill is-${bucket}`}
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                  <span className={`dimension-bar-score score-${bucket}`}>{value}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-reset">Sin dimensiones evaluadas.</p>
        )}
      </section>

      <section className="feedback-grid">
        <section className="feedback-card is-strengths">
          <header className="feedback-card-header">
            <span aria-hidden="true">↑</span>
            <span>Fortalezas</span>
          </header>
          {report.strengths.length ? (
            <ul className="list-compact">
              {report.strengths.map((item, idx) => (
                <li key={`${item}-${idx}`}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="text-reset">No hay fortalezas registradas.</p>
          )}
        </section>

        <section className="feedback-card is-improvements">
          <header className="feedback-card-header">
            <span aria-hidden="true">→</span>
            <span>Mejoras sugeridas</span>
          </header>
          {report.improvements.length ? (
            <ul className="list-compact">
              {report.improvements.map((item, idx) => (
                <li key={`${item}-${idx}`}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="text-reset">No hay mejoras registradas.</p>
          )}
        </section>
      </section>

      <section className="report-meta-grid">
        <div>
          <span>Inicio</span>
          <span>{formatDate(report.startedAt)}</span>
        </div>
        <div>
          <span>Fin</span>
          <span>{formatDate(report.endedAt)}</span>
        </div>
        <div>
          <span>ID sesión</span>
          <span className="token-code">{report.sessionId}</span>
        </div>
      </section>
    </section>
  );
}
