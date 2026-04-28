import { useEffect, useMemo, useState } from "react";
import { templatesApi } from "./templates.api";
import type { AccessLink } from "./types";

type Props = {
  templateId: string;
  onBack: () => void;
};

function formatDate(value?: string): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function TemplateLinksPage({ templateId, onBack }: Props) {
  const [maxUses, setMaxUses] = useState<number>(1);
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [creating, setCreating] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [links, setLinks] = useState<AccessLink[]>([]);

  const canCreate = useMemo(() => maxUses > 0 && !creating, [maxUses, creating]);

  async function loadLinks() {
    setLoadingLinks(true);
    try {
      const res = await templatesApi.listAccessLinks(templateId);
      setLinks(res.data ?? []);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "No se pudieron cargar los links");
    } finally {
      setLoadingLinks(false);
    }
  }

  useEffect(() => {
    loadLinks();
  }, [templateId]);

  async function handleCreate() {
    if (!canCreate) return;
    setErrorMsg(null);
    setCreating(true);
    try {
      const payload = {
        maxUses,
        expiresAt: expiresAt.trim() || undefined,
      };
      await templatesApi.createAccessLink(templateId, payload);
      await loadLinks();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "No se pudo crear el link");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(linkId: string) {
    setErrorMsg(null);
    setRevokingId(linkId);
    try {
      await templatesApi.revokeAccessLink(linkId);
      await loadLinks();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "No se pudo revocar el link");
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <section style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Links de entrevista</h2>
        <button type="button" onClick={onBack}>
          Volver
        </button>
      </div>

      <p>Template ID: {templateId}</p>

      <section style={{ display: "grid", gap: 8, maxWidth: 520 }}>
        <h3 style={{ margin: 0 }}>Crear nuevo link</h3>
        <input
          type="number"
          min={1}
          value={maxUses}
          onChange={(e) => setMaxUses(Number(e.target.value))}
          placeholder="Max uses"
        />
        <input
          type="datetime-local"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
        />
        <button type="button" onClick={handleCreate} disabled={!canCreate}>
          {creating ? "Creando..." : "Crear link"}
        </button>
        {errorMsg ? <p style={{ color: "crimson" }}>{errorMsg}</p> : null}
      </section>

      <section style={{ display: "grid", gap: 8 }}>
        <h3 style={{ margin: 0 }}>Links del template</h3>
        {loadingLinks ? <p>Cargando links...</p> : null}
        {!loadingLinks && !links.length ? (
          <p>No hay links para este template.</p>
        ) : (
          links.map((link) => (
            <article
              key={link.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: 12,
                display: "grid",
                gap: 6,
              }}
            >
              <strong>{link.id}</strong>
              <span>Status: {link.status}</span>
              <span>Usos: {link.usedCount}/{link.maxUses ?? "∞"}</span>
              <span>Expira: {formatDate(link.expiresAt)}</span>
              <span>Creado: {formatDate(link.createdAt)}</span>
              <span>Revocado: {formatDate(link.revokedAt)}</span>
              {link.rawToken ? (
                <code style={{ overflowWrap: "anywhere" }}>{link.rawToken}</code>
              ) : null}
              <div>
                <button
                  type="button"
                  disabled={link.status !== "active" || revokingId === link.id}
                  onClick={() => handleRevoke(link.id)}
                >
                  {revokingId === link.id ? "Revocando..." : "Revocar"}
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </section>
  );
}
