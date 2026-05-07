import { useMemo, useState } from "react";
import type { CreateTemplateInput, InterviewTemplate, RubricDimension } from "../../modules/templates/types";

type Props = {
  initial?: InterviewTemplate | null;
  loading?: boolean;
  submitLabel?: string;
  onSubmit: (payload: CreateTemplateInput) => Promise<void>;
  onCancel?: () => void;
};

const DEFAULT_DIMENSIONS: RubricDimension[] = [
  { key: "architecture", weight: 1, description: "Decisiones de diseño y arquitectura" },
  { key: "communication", weight: 1, description: "Claridad para explicar conceptos técnicos" },
  { key: "problem_solving", weight: 1, description: "Capacidad para abordar y resolver problemas" },
];

function cloneDimensions(initial?: RubricDimension[]): RubricDimension[] {
  if (!initial?.length) return DEFAULT_DIMENSIONS.map((dim) => ({ ...dim }));
  return initial.map((dim) => ({ ...dim }));
}

export function TemplateForm({
  initial,
  loading = false,
  submitLabel = "Guardar",
  onSubmit,
  onCancel,
}: Props) {
  const [templateType, setTemplateType] = useState<CreateTemplateInput["templateType"]>(
    initial?.templateType ?? "dynamic"
  );
  const [title, setTitle] = useState(initial?.title ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [level, setLevel] = useState<CreateTemplateInput["level"]>(initial?.level ?? "mid");
  const [language, setLanguage] = useState(initial?.language ?? "es");
  const [totalQuestions, setTotalQuestions] = useState(initial?.totalQuestions ?? 5);
  const [prompt, setPrompt] = useState(initial?.prompt ?? "");
  const [questions, setQuestions] = useState<string[]>(
    initial?.questions?.length ? initial.questions : [""]
  );

  const [dimensions, setDimensions] = useState<RubricDimension[]>(
    () => cloneDimensions(initial?.rubric.dimensions)
  );
  const [passThreshold, setPassThreshold] = useState(initial?.rubric.passThreshold ?? 70);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const normalizedQuestions = useMemo(
    () => questions.map((item) => item.trim()),
    [questions]
  );
  const questionDuplicates = useMemo(() => {
    const counts = new Map<string, number>();
    for (const question of normalizedQuestions) {
      if (!question) continue;
      const key = question.toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return new Set(Array.from(counts.entries()).filter(([, count]) => count > 1).map(([key]) => key));
  }, [normalizedQuestions]);

  const dimensionKeyDuplicates = useMemo(() => {
    const counts = new Map<string, number>();
    for (const dim of dimensions) {
      const key = dim.key.trim().toLowerCase();
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return new Set(Array.from(counts.entries()).filter(([, count]) => count > 1).map(([key]) => key));
  }, [dimensions]);

  const dimensionsValid = useMemo(() => {
    if (dimensions.length === 0) return false;
    return dimensions.every((dim) => {
      const trimmedKey = dim.key.trim().toLowerCase();
      return (
        trimmedKey.length > 0 &&
        dim.description.trim().length > 0 &&
        dim.weight > 0 &&
        !dimensionKeyDuplicates.has(trimmedKey)
      );
    });
  }, [dimensions, dimensionKeyDuplicates]);

  const canSubmit = useMemo(() => {
    const parsedQuestions = normalizedQuestions.filter(Boolean);
    const hasDuplicates = parsedQuestions.some((item) => questionDuplicates.has(item.toLowerCase()));

    return (
      title.trim().length > 0 &&
      role.trim().length > 0 &&
      language.trim().length >= 2 &&
      dimensionsValid &&
      (templateType === "dynamic"
        ? prompt.trim().length > 0 && totalQuestions > 0
        : parsedQuestions.length > 0 && !hasDuplicates) &&
      passThreshold >= 0 &&
      passThreshold <= 100 &&
      !loading
    );
  }, [
    title,
    role,
    language,
    templateType,
    prompt,
    normalizedQuestions,
    questionDuplicates,
    dimensionsValid,
    totalQuestions,
    passThreshold,
    loading,
  ]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setErrorMsg(null);

    const parsedQuestions = normalizedQuestions.filter(Boolean);

    const payload: CreateTemplateInput = {
      templateType,
      title: title.trim(),
      role: role.trim(),
      level,
      language: language.trim(),
      totalQuestions: templateType === "dynamic" ? totalQuestions : parsedQuestions.length,
      prompt: templateType === "dynamic" ? prompt.trim() : "",
      questions: templateType === "question_set" ? parsedQuestions : [],
      rubric: {
        dimensions: dimensions.map((dim) => ({
          key: dim.key.trim(),
          weight: dim.weight,
          description: dim.description.trim(),
        })),
        passThreshold,
      },
    };

    try {
      await onSubmit(payload);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "No se pudo guardar la plantilla");
    }
  }

  function updateQuestion(index: number, value: string) {
    setQuestions((prev) => prev.map((item, idx) => (idx === index ? value : item)));
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, ""]);
  }

  function removeQuestion(index: number) {
    setQuestions((prev) => {
      const next = prev.filter((_, idx) => idx !== index);
      return next.length ? next : [""];
    });
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    setQuestions((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      const tmp = copy[index];
      copy[index] = copy[target];
      copy[target] = tmp;
      return copy;
    });
  }

  function updateDimension(index: number, patch: Partial<RubricDimension>) {
    setDimensions((prev) =>
      prev.map((dim, idx) => (idx === index ? { ...dim, ...patch } : dim))
    );
  }

  function addDimension() {
    setDimensions((prev) => [...prev, { key: "", weight: 1, description: "" }]);
  }

  function removeDimension(index: number) {
    setDimensions((prev) => prev.filter((_, idx) => idx !== index));
  }

  function moveDimension(index: number, direction: -1 | 1) {
    setDimensions((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      const tmp = copy[index];
      copy[index] = copy[target];
      copy[target] = tmp;
      return copy;
    });
  }

  return (
    <form onSubmit={handleSubmit} className="panel form-stack">
      <h2>{initial ? "Editar entrevista" : "Nueva entrevista"}</h2>

      <select value={templateType} onChange={(e) => setTemplateType(e.target.value as CreateTemplateInput["templateType"])}>
        <option value="dynamic">Dinámica (prompt + LLM)</option>
        <option value="question_set">Preguntas fijas</option>
      </select>

      <input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
      <input placeholder="Rol" value={role} onChange={(e) => setRole(e.target.value)} />

      <div className="row-wrap">
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
      </div>

      {templateType === "dynamic" ? (
        <>
          <textarea
            rows={5}
            placeholder="Prompt base para guiar la entrevista"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <input
            type="number"
            min={1}
            value={totalQuestions}
            onChange={(e) => setTotalQuestions(Number(e.target.value))}
            placeholder="Nº preguntas"
          />
        </>
      ) : (
        <section className="question-editor">
          <div className="question-editor-header">
            <strong>Preguntas fijas</strong>
            <span>{normalizedQuestions.filter(Boolean).length} cargadas</span>
          </div>
          {questions.map((question, index) => {
            const normalized = question.trim().toLowerCase();
            const hasDuplicate = !!normalized && questionDuplicates.has(normalized);
            return (
              <div key={`question-${index}`} className="question-row">
                <input
                  value={question}
                  onChange={(e) => updateQuestion(index, e.target.value)}
                  placeholder={`Pregunta ${index + 1}`}
                />
                <div className="question-row-actions">
                  <button type="button" className="btn-ghost" onClick={() => moveQuestion(index, -1)} disabled={index === 0}>
                    Subir
                  </button>
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => moveQuestion(index, 1)}
                    disabled={index === questions.length - 1}
                  >
                    Bajar
                  </button>
                  <button type="button" className="btn-ghost" onClick={() => removeQuestion(index)}>
                    Eliminar
                  </button>
                </div>
                {!question.trim() ? <p className="error-text">La pregunta no puede estar vacia.</p> : null}
                {hasDuplicate ? <p className="error-text">Pregunta duplicada.</p> : null}
              </div>
            );
          })}
          <button type="button" onClick={addQuestion}>
            Agregar pregunta
          </button>
        </section>
      )}

      <h3 className="section-title">Rúbrica</h3>

      <section className="question-editor">
        <div className="question-editor-header">
          <strong>Dimensiones de evaluación</strong>
          <span>{dimensions.length} cargada{dimensions.length === 1 ? "" : "s"}</span>
        </div>

        {dimensions.map((dim, index) => {
          const trimmedKey = dim.key.trim().toLowerCase();
          const hasDuplicate = !!trimmedKey && dimensionKeyDuplicates.has(trimmedKey);
          const keyInvalid = !dim.key.trim();
          const descriptionInvalid = !dim.description.trim();
          const weightInvalid = dim.weight <= 0;

          return (
            <div key={`dimension-${index}`} className="question-row">
              <input
                value={dim.key}
                onChange={(e) => updateDimension(index, { key: e.target.value })}
                placeholder={`Clave (ej: architecture)`}
              />
              <input
                type="number"
                min={0.1}
                step={0.1}
                value={dim.weight}
                onChange={(e) => updateDimension(index, { weight: Number(e.target.value) })}
                placeholder="Peso"
              />
              <input
                value={dim.description}
                onChange={(e) => updateDimension(index, { description: e.target.value })}
                placeholder="Descripción de la dimensión"
              />

              <div className="question-row-actions">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => moveDimension(index, -1)}
                  disabled={index === 0}
                >
                  Subir
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => moveDimension(index, 1)}
                  disabled={index === dimensions.length - 1}
                >
                  Bajar
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => removeDimension(index)}
                  disabled={dimensions.length === 1}
                >
                  Eliminar
                </button>
              </div>

              {keyInvalid ? <p className="error-text">La clave no puede estar vacía.</p> : null}
              {hasDuplicate ? <p className="error-text">Clave duplicada.</p> : null}
              {weightInvalid ? <p className="error-text">El peso debe ser mayor que 0.</p> : null}
              {descriptionInvalid ? <p className="error-text">La descripción es obligatoria.</p> : null}
            </div>
          );
        })}

        <button type="button" onClick={addDimension}>
          Añadir dimensión
        </button>
      </section>

      <input
        type="number"
        min={0}
        max={100}
        value={passThreshold}
        onChange={(e) => setPassThreshold(Number(e.target.value))}
        placeholder="Pass threshold"
      />

      <div className="row-actions">
        <button type="submit" disabled={!canSubmit}>
          {loading ? "Guardando..." : submitLabel}
        </button>
        {onCancel ? (
          <button type="button" onClick={onCancel}>
            Cancelar
          </button>
        ) : null}
      </div>

      {errorMsg ? <p className="error-text">{errorMsg}</p> : null}
    </form>
  );
}