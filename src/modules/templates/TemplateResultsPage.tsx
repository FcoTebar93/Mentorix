import { Navigate, useNavigate, useParams } from "react-router-dom";

export function TemplateResultsPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();

  if (!templateId) return <Navigate to="/admin/templates" replace />;

  return (
    <section className="stack-md">
      <h2>Resultados de entrevista</h2>
      <p>Template ID: {templateId}</p>
      <p>Aquí conectaremos métricas y sesiones filtradas por entrevista.</p>
      <button type="button" onClick={() => navigate("/admin/templates")}>
        Volver a entrevistas
      </button>
    </section>
  );
}
