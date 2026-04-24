import { CompleteSessionCase } from "../application/cases/complete.case.js";
import { EvaluateAnswerCase } from "../application/cases/evaluate.case.js";
import { StartSessionFromLinkCase } from "../application/cases/start.case.js";
import { SubmitAnswerCase } from "../application/cases/submit.case.js";
import type { ILlmService, ILlmServiceFactory } from "../application/ports/services.js";
import {
  InMemoryInterviewAccessLinkRepository,
  InMemoryInterviewSessionRepository,
  InMemoryInterviewTemplateRepository,
} from "./memory/memory.repository.js";
import { Sha256TokenService, SystemClock, SystemIdGenerator } from "./system/system.service.js";
import { CreateTemplateCase } from "../application/cases/create-template.case.js";
import { CreateAccessLinkCase } from "../application/cases/create-access-link.case.js";
import { ListSessionsCase } from "../application/cases/list-sessions.case.js";
import { GetSessionReportCase } from "../application/cases/get-session.case.js";
import { ListSessionReportsCase } from "../application/cases/list-reports.case.js";
import { CompleteTurnCase } from "../application/cases/complete-turn.case.js";

type BuildTestContainerOptions = {
  llmService?: ILlmService;
};

const defaultLlmStub: ILlmService = {
  async generateQuestion() {
    return { text: "stub-question" };
  },
  async evaluateAnswer() {
    return {
      score: 80,
      dimensionScores: { architecture: 80 },
      strengths: ["clear structure"],
      improvements: ["add more depth"],
      confidence: 0.9,
    };
  },
};

const buildLlmFactory = (llmService: ILlmService): ILlmServiceFactory => ({
  forTemplate() {
    return llmService;
  },
});

export function buildTestContainer(options: BuildTestContainerOptions = {}) {
  const templates = new InMemoryInterviewTemplateRepository();
  const links = new InMemoryInterviewAccessLinkRepository();
  const sessions = new InMemoryInterviewSessionRepository();

  const clock = new SystemClock();
  const ids = new SystemIdGenerator();
  const tokenService = new Sha256TokenService();

  const llmService = options.llmService ?? defaultLlmStub;
  const llmFactory = buildLlmFactory(llmService);

  const createTemplate = new CreateTemplateCase(templates, ids, clock);
  const createAccessLink = new CreateAccessLinkCase(links, templates, tokenService, ids, clock);

  const startSession = new StartSessionFromLinkCase(
    links,
    templates,
    sessions,
    llmFactory,
    tokenService,
    ids,
    clock
  );

  const submitAnswer = new SubmitAnswerCase(sessions, ids, clock);
  const evaluateAnswer = new EvaluateAnswerCase(sessions, templates, llmFactory, ids, clock);
  const completeSession = new CompleteSessionCase(sessions, templates, llmFactory, ids, clock);
  const listSessions = new ListSessionsCase(sessions);
  const getSessionReport = new GetSessionReportCase(sessions);
  const listSessionReports = new ListSessionReportsCase(sessions);
  const completeTurn = new CompleteTurnCase(submitAnswer, evaluateAnswer, completeSession);

  return {
    repositories: { templates, links, sessions },
    services: { clock, ids, tokenService, llmService, llmFactory },
    useCases: { createTemplate, createAccessLink, startSession, submitAnswer, evaluateAnswer, completeSession, listSessions, getSessionReport, listSessionReports, completeTurn },
  };
}