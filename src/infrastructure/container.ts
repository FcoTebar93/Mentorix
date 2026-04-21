import { CompleteSessionCase } from "../application/cases/complete.case.js";
import { EvaluateAnswerCase } from "../application/cases/evaluate.case.js";
import { StartSessionFromLinkCase } from "../application/cases/start.case.js";
import { SubmitAnswerCase } from "../application/cases/submit.case.js";
import { loadLlmConfig } from "./config.llm.js";
import { createLlmService } from "./llm/providers/factory.js";
import {
  InMemoryInterviewAccessLinkRepository,
  InMemoryInterviewSessionRepository,
  InMemoryInterviewTemplateRepository,
} from "./memory/memory.repositories.js";
import { Sha256TokenService, SystemClock, SystemIdGenerator } from "./system/system.service.js";

export function buildContainer() {
  // Repositories
  const templates = new InMemoryInterviewTemplateRepository();
  const links = new InMemoryInterviewAccessLinkRepository();
  const sessions = new InMemoryInterviewSessionRepository();

  // Infra services
  const clock = new SystemClock();
  const ids = new SystemIdGenerator();
  const tokenService = new Sha256TokenService();

  // LLM
  const llmConfig = loadLlmConfig(process.env);
  const llmService = createLlmService(llmConfig);

  // Use cases
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
    useCases: { startSession, submitAnswer, evaluateAnswer, completeSession },
  };
}