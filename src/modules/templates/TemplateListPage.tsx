import { useEffect, useState } from "react";
import { templatesApi } from "../../modules/templates/templates.api";
import type { InterviewTemplate } from "../../modules/templates/types";

type Props = {
  onCreate: () => void;
  onEdit: (templateId: string) => void;
  onLinks: (templateId: string) => void;
  onResults: (templateId: string) => void;
};

export function TemplateListPage({ onCreate, onEdit, onLinks, onResults }: Props) {
  const [items, setItems] = useState<InterviewTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await templatesApi.list();
      setItems(res.data ?? []);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "No se pudieron cargar entrevistas");
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(templateId: string) {
    try {
      await templatesApi.remove(templateId);
      await load();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "No se pudo eliminar");
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <section style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Entrevistas</h2>
        <button type="button" onClick={onCreate}>
          Nueva entrevista
        </button>
      </div>

      {loading ? <p>Cargando...</p> : null}
      {errorMsg ? <p style={{ color: "crimson" }}>{errorMsg}</p> : null}

      {!loading && !errorMsg && !items.length ? <p>No hay entrevistas todavía.</p> : null}

      <div style={{ display: "grid", gap: 10 }}>
        {items.map((t) => (
          <article
            key={t.id}
            style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, display: "grid", gap: 6 }}
          >
            <strong>{t.title}</strong>
            <span>Rol: {t.role}</span>
            <span>Nivel: {t.level}</span>
            <span>Idioma: {t.language}</span>
            <span>Preguntas: {t.totalQuestions}</span>
            <span>Estado: {t.isArchived ? "Archivada" : "Activa"}</span>

            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => onEdit(t.id)}>
                Editar
              </button>
              <button type="button" onClick={() => onLinks(t.id)}>
                Links
              </button>
              <button type="button" onClick={() => onResults(t.id)}>
                Resultados
              </button>
              <button type="button" onClick={() => onDelete(t.id)}>
                Eliminar/Archivar
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}