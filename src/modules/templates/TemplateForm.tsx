import { useMemo, useState } from "react";
import type { CreateTemplateInput, InterviewTemplate } from "../../modules/templates/types";

type Props = {
  initial?: InterviewTemplate | null;
  loading?: boolean;
  submitLabel?: string;
  onSubmit: (payload: CreateTemplateInput) => Promise<void>;
  onCancel?: () => void;
};

export function TemplateForm({
  initial,
  loading = false,
  submitLabel = "Guardar",
  onSubmit,
  onCancel,
}: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [level, setLevel] = useState<CreateTemplateInput["level"]>(initial?.level ?? "mid");
  const [language, setLanguage] = useState(initial?.language ?? "es");
  const [totalQuestions, setTotalQuestions] = useState(initial?.totalQuestions ?? 5);

  const [rubricKey, setRubricKey] = useState(initial?.rubric.dimensions[0]?.key ?? "architecture");
  const [rubricWeight, setRubricWeight] = useState(initial?.rubric.dimensions[0]?.weight ?? 1);
  const [rubricDescription, setRubricDescription] = useState(
    initial?.rubric.dimensions[0]?.description ?? "Capacidad técnica general"
  );
  const [passThreshold, setPassThreshold] = useState(initial?.rubric.passThreshold ?? 70);

  const [provider, setProvider] = useState<CreateTemplateInput["llmConfig"]["provider"]>(
    initial?.llmConfig.provider ?? "openai"
  );
  const [model, setModel] = useState(initial?.llmConfig.model ?? "gpt-4o-mini");
  const [temperature, setTemperature] = useState(initial?.llmConfig.temperature ?? 0.2);
  const [maxTokensPerTurn, setMaxTokensPerTurn] = useState(
    initial?.llmConfig.maxTokensPerTurn ?? 700
  );

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return (
      title.trim().length > 0 &&
      role.trim().length > 0 &&
      language.trim().length >= 2 &&
      rubricKey.trim().length > 0 &&
      rubricDescription.trim().length > 0 &&
      model.trim().length > 0 &&
      totalQuestions > 0 &&
      rubricWeight > 0 &&
      passThreshold >= 0 &&
      passThreshold <= 100 &&
      !loading
    );
  }, [
    title,
    role,
    language,
    rubricKey,
    rubricDescription,
    model,
    totalQuestions,
    rubricWeight,
    passThreshold,
    loading,
  ]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setErrorMsg(null);

    const payload: CreateTemplateInput = {
      title: title.trim(),
      role: role.trim(),
      level,
      language: language.trim(),
      totalQuestions,
      rubric: {
        dimensions: [
          {
            key: rubricKey.trim(),
            weight: rubricWeight,
            description: rubricDescription.trim(),
          },
        ],
        passThreshold,
      },
      llmConfig: {
        provider,
        model: model.trim(),
        temperature,
        maxTokensPerTurn,
      },
    };

    try {
      await onSubmit(payload);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "No se pudo guardar la plantilla");
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12, maxWidth: 760 }}>
      <h2>{initial ? "Editar entrevista" : "Nueva entrevista"}</h2>

      <input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
      <input placeholder="Rol" value={role} onChange={(e) => setRole(e.target.value)} />

      <div style={{ display: "flex", gap: 8 }}>
        <select value={level} onChange={(e) => setLevel(e.target.value as CreateTemplateInput["level"])}>
          <option value="junior">junior</option>
          <option value="mid">mid</option>
          <option value="senior">senior</option>
        </select>

        <input
          placeholder="Idioma (es, en...)"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        />

        <input
          type="number"
          min={1}
          value={totalQuestions}
          onChange={(e) => setTotalQuestions(Number(e.target.value))}
          placeholder="Nº preguntas"
        />
      </div>

      <h3 style={{ margin: "8px 0 0" }}>Rúbrica</h3>
      <input
        placeholder="Dimension key (ej: architecture)"
        value={rubricKey}
        onChange={(e) => setRubricKey(e.target.value)}
      />
      <input
        type="number"
        min={0.1}
        step={0.1}
        value={rubricWeight}
        onChange={(e) => setRubricWeight(Number(e.target.value))}
        placeholder="Peso"
      />
      <input
        placeholder="Descripción dimensión"
        value={rubricDescription}
        onChange={(e) => setRubricDescription(e.target.value)}
      />
      <input
        type="number"
        min={0}
        max={100}
        value={passThreshold}
        onChange={(e) => setPassThreshold(Number(e.target.value))}
        placeholder="Pass threshold"
      />

      <h3 style={{ margin: "8px 0 0" }}>LLM</h3>
      <select
        value={provider}
        onChange={(e) =>
          setProvider(e.target.value as CreateTemplateInput["llmConfig"]["provider"])
        }
      >
        <option value="openai">openai</option>
        <option value="anthropic">anthropic</option>
        <option value="google">google</option>
        <option value="azure">azure</option>
        <option value="ollama">ollama</option>
        <option value="custom">custom</option>
        <option value="mock">mock</option>
      </select>
      <input placeholder="Modelo" value={model} onChange={(e) => setModel(e.target.value)} />
      <input
        type="number"
        min={0}
        max={2}
        step={0.1}
        value={temperature}
        onChange={(e) => setTemperature(Number(e.target.value))}
        placeholder="temperature"
      />
      <input
        type="number"
        min={1}
        value={maxTokensPerTurn}
        onChange={(e) => setMaxTokensPerTurn(Number(e.target.value))}
        placeholder="max tokens/turn"
      />

      <div style={{ display: "flex", gap: 8 }}>
        <button type="submit" disabled={!canSubmit}>
          {loading ? "Guardando..." : submitLabel}
        </button>
        {onCancel ? (
          <button type="button" onClick={onCancel}>
            Cancelar
          </button>
        ) : null}
      </div>

      {errorMsg ? <p style={{ color: "crimson" }}>{errorMsg}</p> : null}
    </form>
  );
}