import { CompleteSessionCase } from "../application/cases/complete.case.js";
import { EvaluateAnswerCase } from "../application/cases/evaluate.case.js";
import { StartSessionFromLinkCase } from "../application/cases/start.case.js";
import { SubmitAnswerCase } from "../application/cases/submit.case.js";
import type { ILlmService } from "../application/ports/services.js";
import {
  InMemoryInterviewAccessLinkRepository,
  InMemoryInterviewSessionRepository,
  InMemoryInterviewTemplateRepository,
} from "./memory/memory.repositories.js";
import { Sha256TokenService, SystemClock, SystemIdGenerator } from "./system/system.service.js";
import { CreateTemplateCase } from "../application/cases/create-template.case.js";
import { CreateAccessLinkCase } from "../application/cases/create-access-link.case.js";

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

export function buildTestContainer(options: BuildTestContainerOptions = {}) {
  const templates = new InMemoryInterviewTemplateRepository();
  const links = new InMemoryInterviewAccessLinkRepository();
  const sessions = new InMemoryInterviewSessionRepository();

  const clock = new SystemClock();
  const ids = new SystemIdGenerator();
  const tokenService = new Sha256TokenService();

  const llmService = options.llmService ?? defaultLlmStub;

  const createTemplate = new CreateTemplateCase(templates, ids, clock);
  const createAccessLink = new CreateAccessLinkCase(links, templates, tokenService, ids, clock);

  const startSession = new StartSessionFromLinkCase(
    links,
    templates,
    sessions,
    tokenService,
    ids,
    clock
  );

  const submitAnswer = new SubmitAnswerCase(sessions, ids, clock);
  const evaluateAnswer = new EvaluateAnswerCase(sessions, llmService, ids, clock);
  const completeSession = new CompleteSessionCase(sessions, clock);

  return {
    repositories: { templates, links, sessions },
    services: { clock, ids, tokenService, llmService },
    useCases: { createTemplate, createAccessLink, startSession, submitAnswer, evaluateAnswer, completeSession },
  };
}