import { CompleteSessionCase } from "../application/cases/complete.case.js";
import { EvaluateAnswerCase } from "../application/cases/evaluate.case.js";
import { StartSessionFromLinkCase } from "../application/cases/start.case.js";
import { SubmitAnswerCase } from "../application/cases/submit.case.js";
import type {
  ILlmService,
  ILlmServiceFactory,
  ISttService,
  ISttServiceFactory,
  ITtsService,
  ITtsServiceFactory,
} from "../application/ports/services.js";
import {
  InMemoryInterviewAccessLinkRepository,
  InMemoryInterviewSessionRepository,
  InMemoryInterviewTemplateRepository,
} from "./memory/memory.repository.js";
import { Sha256TokenService, SystemClock, SystemIdGenerator } from "./system/system.service.js";
import { CreateTemplateCase } from "../application/cases/create-template.case.js";
import { CreateAccessLinkCase } from "../application/cases/create-access-link.case.js";
import { ListAccessLinksCase } from "../application/cases/list-access-links.case.js";
import { RevokeAccessLinkCase } from "../application/cases/revoke-access-link.case.js";
import { ListSessionsCase } from "../application/cases/list-sessions.case.js";
import { GetSessionReportCase } from "../application/cases/get-session.case.js";
import { ListSessionReportsCase } from "../application/cases/list-reports.case.js";
import { CompleteTurnCase } from "../application/cases/complete-turn.case.js";
import { VoiceTurnCase } from "../application/cases/voice.case.js";

type BuildTestContainerOptions = {
  llmService?: ILlmService;
  sttService?: ISttService;
  ttsService?: ITtsService;
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

const defaultSttStub: ISttService = {
  async transcribe() {
    return { text: "stub-transcription" };
  },
};

const defaultTtsStub: ITtsService = {
  async synthesize() {
    return { audioBase64: Buffer.from("stub-audio", "utf-8").toString("base64") };
  },
};

const buildSttFactory = (sttService: ISttService): ISttServiceFactory => ({
  forVoiceConfig() {
    return sttService;
  },
});

const buildTtsFactory = (ttsService: ITtsService): ITtsServiceFactory => ({
  forVoiceConfig() {
    return ttsService;
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
  const sttService = options.sttService ?? defaultSttStub;
  const ttsService = options.ttsService ?? defaultTtsStub;
  const sttFactory = buildSttFactory(sttService);
  const ttsFactory = buildTtsFactory(ttsService);

  const createTemplate = new CreateTemplateCase(templates, ids, clock);
  const createAccessLink = new CreateAccessLinkCase(links, templates, tokenService, ids, clock);
  const listAccessLinks = new ListAccessLinksCase(links, templates);
  const revokeAccessLink = new RevokeAccessLinkCase(links, templates, clock);

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
  const voiceTurn = new VoiceTurnCase(sttService, ttsService, completeTurn);

  return {
    repositories: { templates, links, sessions },
    services: {
      clock,
      ids,
      tokenService,
      llmService,
      llmFactory,
      sttService,
      ttsService,
      sttFactory,
      ttsFactory,
    },
    useCases: { createTemplate, createAccessLink, listAccessLinks, revokeAccessLink, startSession, submitAnswer, evaluateAnswer, completeSession, listSessions, getSessionReport, listSessionReports, completeTurn, voiceTurn },
  };
}