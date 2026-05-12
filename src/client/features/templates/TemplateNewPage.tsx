import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTemplatesApi } from "../../app/providers/ApiClientsProvider";
import { TemplateForm } from "./TemplateForm";
import type { CreateTemplateInput } from "./types";

export function TemplateNewPage() {
  const navigate = useNavigate();
  const templatesApi = useTemplatesApi();
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
