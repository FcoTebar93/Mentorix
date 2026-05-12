import { useEffect, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useTemplatesApi } from "../../app/providers/ApiClientsProvider";
import { TemplateForm } from "./TemplateForm";
import type { CreateTemplateInput, InterviewTemplate } from "./types";

export function TemplateEditPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const templatesApi = useTemplatesApi();

  const [template, setTemplate] = useState<InterviewTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!templateId) return;
    let active = true;

    async function load() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await templatesApi.getById(templateId!);
        if (!active) return;
        setTemplate(res.data);
      } catch (err) {
        if (!active) return;
        setErrorMsg(err instanceof Error ? err.message : "No se pudo cargar la plantilla");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [templateId, templatesApi]);

  if (!templateId) return <Navigate to="/admin/templates" replace />;
  if (loading) return <p>Cargando plantilla...</p>;
  if (errorMsg) return <p className="error-text">{errorMsg}</p>;
  if (!template) return <p>No se encontró la plantilla.</p>;

  return (
    <TemplateForm
      initial={template}
      loading={saving}
      submitLabel="Guardar cambios"
      onCancel={() => navigate("/admin/templates")}
      onSubmit={async (payload: CreateTemplateInput) => {
        setSaving(true);
        try {
          await templatesApi.update(template.id, payload);
          navigate("/admin/templates");
        } finally {
          setSaving(false);
        }
      }}
    />
  );
}
