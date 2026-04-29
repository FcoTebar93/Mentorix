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

function buildAccessUrl(rawToken: string): string {
  const origin =
    (typeof window !== "undefined" && window.location?.origin) ||
    "http://localhost:5173";
  return `${origin}/interview/${encodeURIComponent(rawToken)}`;
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
      const res = await templatesApi.createAccessLink(templateId, payload);
      const created = res.data;
      setLinks((prev) => [
        { ...created, accessUrl: created.rawToken ? buildAccessUrl(created.rawToken) : undefined },
        ...prev,
      ]);
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
    <section className="panel">
      <div className="panel-header">
        <h2>Links de entrevista</h2>
        <button type="button" onClick={onBack}>
          Volver
        </button>
      </div>

      <p>Template ID: {templateId}</p>

      <section className="form-stack">
        <h3 className="title-reset">Crear nuevo link</h3>
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
        {errorMsg ? <p className="error-text">{errorMsg}</p> : null}
      </section>

      <section className="card-grid">
        <h3 className="title-reset">Links del template</h3>
        {loadingLinks ? <p>Cargando links...</p> : null}
        {!loadingLinks && !links.length ? (
          <p>No hay links para este template.</p>
        ) : (
          links.map((link) => (
            <article key={link.id} className="card">
              <strong>{link.id}</strong>
              <span>Status: {link.status}</span>
              <span>Usos: {link.usedCount}/{link.maxUses ?? "∞"}</span>
              <span>Expira: {formatDate(link.expiresAt)}</span>
              <span>Creado: {formatDate(link.createdAt)}</span>
              <span>Revocado: {formatDate(link.revokedAt)}</span>
              {link.rawToken ? (
                <>
                  <code className="token-code">{link.rawToken}</code>
                  <div className="copy-link-row">
                    <input
                      readOnly
                      value={buildAccessUrl(link.rawToken)}
                      className="copy-link-input"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(buildAccessUrl(link.rawToken!));
                        } catch (err) {
                          setErrorMsg(err instanceof Error ? err.message : "No se pudo copiar el link");
                        }
                      }}
                    >
                      Copiar URL
                    </button>
                  </div>
                </>
              ) : null}
              <div className="row-actions">
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
