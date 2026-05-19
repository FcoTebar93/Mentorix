import { InterviewSession } from "../../domain/interview/session/session.aggregate.js";
import type { InterviewSessionRepository, InterviewTemplateRepository } from "../ports/repositories.js";
import type { Clock, ILlmServiceFactory, IdGenerator } from "../ports/services.js";
import { TimingTrace } from "../../lib/observability/timing.js";
import { normalizeDimensionScores, normalizeScoreValue } from "../../lib/interview/report-scores.js";

export interface EvaluateAnswerCommand {
  sessionId: string;
  rubricDimensions: { key: string; weight: number }[];
}

export class EvaluateAnswerCase {
  constructor(
    private readonly sessions: InterviewSessionRepository,
    private readonly templates: InterviewTemplateRepository,
    private readonly llmFactory: ILlmServiceFactory,
    private readonly ids: IdGenerator,
    private readonly clock: Clock
  ) {}

  async execute(command: EvaluateAnswerCommand) {
    const trace = new TimingTrace("evaluate_answer", {
      sessionId: command.sessionId,
      rubricDimensions: command.rubricDimensions.length,
    });

    try {
      const stored = await trace.step("load_session", () => this.sessions.getById(command.sessionId));
      if (!stored) throw new Error("SESSION_NOT_FOUND");

      const session = new InterviewSession(stored);
      const template = await trace.step("load_template", () => this.templates.getById(session.state.templateId));
      if (!template) {
        throw new Error("TEMPLATE_NOT_FOUND");
      }
      const llm = this.llmFactory.forTemplate(template.llmConfig);
      const rubricDimensions =
        template.rubric?.dimensions?.length > 0 ? template.rubric.dimensions : command.rubricDimensions;
      if (!rubricDimensions.length) {
        throw new Error("RUBRIC_DIMENSIONS_REQUIRED");
      }

      const lastAnswer = session.state.answers[session.state.answers.length - 1];
      const lastQuestion = session.state.questions[session.state.questions.length - 1];

      let draft;
      try {
        draft = await trace.step("llm_evaluate_answer", () =>
          llm.evaluateAnswer({
            question: lastQuestion.text,
            answer: lastAnswer,
            rubric: { dimensions: rubricDimensions },
          })
        );
      } catch (error) {
        if (error instanceof Error && error.message.startsWith("LLM_")) {
          throw error;
        }
        throw new Error("LLM_EVALUATION_FAILED");
      }

      const normalizedDimensions = normalizeDimensionScores(draft.dimensionScores ?? {});
      const normalizedScore =
        Number.isFinite(draft.score) && draft.score > 10 && draft.score <= 100
          ? Math.round(draft.score)
          : normalizeScoreValue(draft.score);

      session.storeEvaluation({
        id: this.ids.uuid(),
        answerId: lastAnswer.id,
        score: normalizedScore,
        dimensionScores: normalizedDimensions,
        strengths: draft.strengths,
        improvements: draft.improvements,
        confidence: draft.confidence,
        evaluatedAt: this.clock.nowISO(),
      });

      const strengths = (draft.strengths ?? []).filter(Boolean).slice(0, 2);
      const improvements = (draft.improvements ?? []).filter(Boolean).slice(0, 2);

      const feedbackParts = [
        `Puntaje: ${draft.score}/100.`,
        strengths.length ? `Fortalezas: ${strengths.join(", ")}.` : "",
        improvements.length ? `Mejoras sugeridas: ${improvements.join(", ")}.` : "",
        draft.score >= 80
          ? "Buen desempeño general, puedes avanzar con confianza."
          : draft.score >= 60
            ? "Desempeño aceptable, conviene reforzar los puntos de mejora."
            : "Necesita más práctica en fundamentos antes de avanzar.",
      ].filter(Boolean);

      const feedbackText = feedbackParts.join(" ");

      session.addFeedback({
        id: this.ids.uuid(),
        answerId: lastAnswer.id,
        text: feedbackText,
        generatedAt: this.clock.nowISO(),
      });

      await trace.step("save_session", () => this.sessions.save(session.state));
      trace.end({
        templateType: template.templateType,
        llmProvider: template.llmConfig.provider,
        llmModel: template.llmConfig.model,
        rubricDimensionKeys: rubricDimensions.map((dimension) => dimension.key).join(","),
        score: draft.score,
      });
      return session.state;
    } catch (error) {
      trace.end({ failed: true, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }
}