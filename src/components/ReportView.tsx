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

function scoreColor(score: number | null): string {
  if (score === null) return "#6b7280";
  if (score >= 80) return "#166534";
  if (score >= 60) return "#92400e";
  return "#991b1b";
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
  if (errorMsg) return <p style={{ color: "crimson" }}>{errorMsg}</p>;
  if (!report) return <p>No hay reporte.</p>;

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <h2>Reporte final</h2>

      <section
        style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 12,
          display: "grid",
          gap: 8,
        }}
      >
        <div><strong>Sesión:</strong> {report.sessionId}</div>
        <div><strong>Estado:</strong> {report.status}</div>
        <div>
          <strong>Score global:</strong>{" "}
          <span style={{ color: scoreColor(report.overallScore), fontWeight: 700 }}>
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

      <section
        style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 12,
          display: "grid",
          gap: 8,
        }}
      >
        <h3 style={{ margin: 0 }}>Recomendación</h3>
        <p style={{ margin: 0 }}>{report.recommendation}</p>
      </section>

      <section
        style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 12,
          display: "grid",
          gap: 8,
        }}
      >
        <h3 style={{ margin: 0 }}>Promedio por dimensión</h3>
        {sortedDimensions.length ? (
          <div style={{ display: "grid", gap: 6 }}>
            {sortedDimensions.map(([key, value]) => (
              <div key={key} style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{key}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0 }}>Sin dimensiones evaluadas.</p>
        )}
      </section>

      <section
        style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 12,
          display: "grid",
          gap: 8,
        }}
      >
        <h3 style={{ margin: 0 }}>Fortalezas</h3>
        {report.strengths.length ? (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {report.strengths.map((item, idx) => (
              <li key={`${item}-${idx}`}>{item}</li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: 0 }}>No hay fortalezas registradas.</p>
        )}
      </section>

      <section
        style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 12,
          display: "grid",
          gap: 8,
        }}
      >
        <h3 style={{ margin: 0 }}>Mejoras sugeridas</h3>
        {report.improvements.length ? (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {report.improvements.map((item, idx) => (
              <li key={`${item}-${idx}`}>{item}</li>
            ))}
          </ul>
        ) : (
          <p style={{ margin: 0 }}>No hay mejoras registradas.</p>
        )}
      </section>
    </section>
  );
}