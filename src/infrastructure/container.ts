import { CompleteSessionCase } from "../application/cases/complete.case.js";
import { EvaluateAnswerCase } from "../application/cases/evaluate.case.js";
import { StartSessionFromLinkCase } from "../application/cases/start.case.js";
import { SubmitAnswerCase } from "../application/cases/submit.case.js";
import { loadLlmConfig } from "./config.llm.js";
import { createLlmService } from "./llm/providers/factory.js";
import { Sha256TokenService, SystemClock, SystemIdGenerator } from "./system/system.service.js";
import { CreateTemplateCase } from "../application/cases/create-template.case.js";
import { CreateAccessLinkCase } from "../application/cases/create-access-link.case.js";
import { PgInterviewTemplateRepository } from "./repositories/postgres/template.repository.js";
import { PgInterviewAccessLinkRepository } from "./repositories/postgres/access-link.repository.js";
import { PgInterviewSessionRepository } from "./repositories/postgres/session.repository.js";
import { ListSessionsCase } from "../application/cases/list-sessions.case.js";
import { GetSessionReportCase } from "../application/cases/get-session.case.js";
import { ListSessionReportsCase } from "../application/cases/list-reports.case.js";

export function buildContainer() {
  const templates = new PgInterviewTemplateRepository();
  const links = new PgInterviewAccessLinkRepository();
  const sessions = new PgInterviewSessionRepository();

  const clock = new SystemClock();
  const ids = new SystemIdGenerator();
  const tokenService = new Sha256TokenService();

  const llmConfig = loadLlmConfig(process.env);
  const llmService = createLlmService(llmConfig);

  const createTemplate = new CreateTemplateCase(templates, ids, clock);
  const createAccessLink = new CreateAccessLinkCase(links, templates, tokenService, ids, clock);

  const startSession = new StartSessionFromLinkCase(
    links,
    templates,
    sessions,
    llmService,
    tokenService,
    ids,
    clock
  );

  const submitAnswer = new SubmitAnswerCase(sessions, ids, clock);
  const evaluateAnswer = new EvaluateAnswerCase(sessions, llmService, ids, clock);
  const completeSession = new CompleteSessionCase(sessions, templates, llmService, ids, clock);
  const listSessions = new ListSessionsCase(sessions);
  const getSessionReport = new GetSessionReportCase(sessions);
  const listSessionReports = new ListSessionReportsCase(sessions);
  
  return {
    repositories: { templates, links, sessions },
    services: { clock, ids, tokenService, llmService },
    useCases: { createTemplate, createAccessLink, startSession, submitAnswer, evaluateAnswer, completeSession, listSessions, getSessionReport, listSessionReports },
  };
}