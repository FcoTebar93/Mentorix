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

  const [rubricKey, setRubricKey] = useState(initial?.rubric.dimensions[0]?.key ?? "architecture");
  const [rubricWeight, setRubricWeight] = useState(initial?.rubric.dimensions[0]?.weight ?? 1);
  const [rubricDescription, setRubricDescription] = useState(
    initial?.rubric.dimensions[0]?.description ?? "Capacidad técnica general"
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

  const canSubmit = useMemo(() => {
    const parsedQuestions = normalizedQuestions.filter(Boolean);
    const hasDuplicates = parsedQuestions.some((item) => questionDuplicates.has(item.toLowerCase()));

    return (
      title.trim().length > 0 &&
      role.trim().length > 0 &&
      language.trim().length >= 2 &&
      rubricKey.trim().length > 0 &&
      rubricDescription.trim().length > 0 &&
      (templateType === "dynamic"
        ? prompt.trim().length > 0 && totalQuestions > 0
        : parsedQuestions.length > 0 && !hasDuplicates) &&
      rubricWeight > 0 &&
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
    rubricKey,
    rubricDescription,
    totalQuestions,
    rubricWeight,
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
        dimensions: [
          {
            key: rubricKey.trim(),
            weight: rubricWeight,
            description: rubricDescription.trim(),
          },
        ],
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