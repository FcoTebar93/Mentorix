import { useEffect, useState } from "react";
import { interviewApi } from "../lib/api/interview";
import type { SessionReport } from "../lib/interview/types";

type Props = {
  sessionId: string;
};

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

  if (loading) return <p>Cargando reporte...</p>;
  if (errorMsg) return <p style={{ color: "crimson" }}>{errorMsg}</p>;
  if (!report) return <p>No hay reporte.</p>;

  return (
    <section style={{ display: "grid", gap: 12 }}>
      <h2>Reporte final</h2>
      <pre style={{ background: "#111", color: "#ddd", padding: 12, borderRadius: 8 }}>
        {JSON.stringify(report, null, 2)}
      </pre>
    </section>
  );
}