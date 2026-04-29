import { useEffect, useMemo, useState } from "react";
import { interviewApi } from "../lib/api/interview";
import type { SessionReport } from "../lib/interview/types";

type Props = {
  sessionId: string;
};

function formatDate(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function scoreClass(score: number | null): string {
  if (score === null) return "score-muted";
  if (score >= 80) return "score-high";
  if (score >= 60) return "score-mid";
  return "score-low";
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

  return (
    <section className="stack-lg">
      <h2>Reporte final</h2>

      <section className="info-card">
        <div><strong>Sesión:</strong> {report.sessionId}</div>
        <div><strong>Estado:</strong> {report.status}</div>
        <div>
          <strong>Score global:</strong>{" "}
          <span className={`score-value ${scoreClass(report.overallScore)}`}>
            {report.overallScore ?? "N/A"}
          </span>
        </div>
        <div><strong>Respuestas evaluadas:</strong> {report.evaluatedAnswers}</div>
        <div>
          <strong>Confianza media:</strong>{" "}
          {report.confidenceAverage !== null ? report.confidenceAverage : "N/A"}
        </div>
        <div><strong>Inicio:</strong> {formatDate(report.startedAt)}</div>
        <div><strong>Fin:</strong> {formatDate(report.endedAt)}</div>
      </section>

      <section className="info-card">
        <h3 className="title-reset">Recomendación</h3>
        <p className="text-reset">{report.recommendation}</p>
      </section>

      <section className="info-card">
        <h3 className="title-reset">Promedio por dimensión</h3>
        {sortedDimensions.length ? (
          <div className="stack-xs">
            {sortedDimensions.map(([key, value]) => (
              <div key={key} className="between-row">
                <span>{key}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-reset">Sin dimensiones evaluadas.</p>
        )}
      </section>

      <section className="info-card">
        <h3 className="title-reset">Fortalezas</h3>
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

      <section className="info-card">
        <h3 className="title-reset">Mejoras sugeridas</h3>
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
  );
}