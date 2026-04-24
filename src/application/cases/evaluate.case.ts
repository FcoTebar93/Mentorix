import { InterviewSession } from "../../domain/interview/session/session.aggregate.js";
import type { InterviewSessionRepository, InterviewTemplateRepository } from "../ports/repositories.js";
import type { Clock, ILlmServiceFactory, IdGenerator } from "../ports/services.js";

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
    const stored = await this.sessions.getById(command.sessionId);
    if (!stored) throw new Error("SESSION_NOT_FOUND");

    if (!command.rubricDimensions.length) {
      throw new Error("RUBRIC_DIMENSIONS_REQUIRED");
    }

    const session = new InterviewSession(stored);
    const template = await this.templates.getById(session.state.templateId);
      if (!template){
        throw new Error("TEMPLATE_NOT_FOUND");
    }
    const llm =
      this.llmFactory.forTemplateWithFallback?.(template.llmConfig, ["mock"]) ??
      this.llmFactory.forTemplate(template.llmConfig);

    const lastAnswer = session.state.answers[session.state.answers.length - 1];
    const lastQuestion = session.state.questions[session.state.questions.length - 1];
    
    let draft;
    try {
      draft = await llm.evaluateAnswer({
        question: lastQuestion.text,
        answer: lastAnswer,
        rubric: { dimensions: command.rubricDimensions },
      });
    } catch {
      throw new Error("LLM_EVALUATION_FAILED");
    }

    session.storeEvaluation({
      id: this.ids.uuid(),
      answerId: lastAnswer.id,
      score: draft.score,
      dimensionScores: draft.dimensionScores,
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

    await this.sessions.save(session.state);
    return session.state;
  }
}