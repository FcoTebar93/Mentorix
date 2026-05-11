import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TemplateForm } from "./TemplateForm";
import { templatesApi } from "./templates.api";
import type { CreateTemplateInput } from "./types";

export function TemplateNewPage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  return (
    <TemplateForm
      loading={saving}
      submitLabel="Crear entrevista"
      onCancel={() => navigate("/admin/templates")}
      onSubmit={async (payload: CreateTemplateInput) => {
        setSaving(true);
        try {
          await templatesApi.create(payload);
          navigate("/admin/templates");
        } finally {
          setSaving(false);
        }
      }}
    />
  );
}
