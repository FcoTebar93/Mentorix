import { CompleteSessionCase } from "../application/cases/complete.case.js";
import { EvaluateAnswerCase } from "../application/cases/evaluate.case.js";
import { StartSessionFromLinkCase } from "../application/cases/start.case.js";
import { SubmitAnswerCase } from "../application/cases/submit.case.js";
import { EnvLlmServiceFactory } from "./llm/llm.factory.js";
import { Sha256TokenService, SystemClock, SystemIdGenerator } from "./system/system.service.js";
import { CreateTemplateCase } from "../application/cases/create-template.case.js";
import { CreateAccessLinkCase } from "../application/cases/create-access-link.case.js";
import { ListAccessLinksCase } from "../application/cases/list-access-links.case.js";
import { RevokeAccessLinkCase } from "../application/cases/revoke-access-link.case.js";
import { PgInterviewTemplateRepository } from "./repositories/postgres/template.repository.js";
import { PgInterviewAccessLinkRepository } from "./repositories/postgres/access-link.repository.js";
import { PgInterviewSessionRepository } from "./repositories/postgres/session.repository.js";
import { ListSessionsCase } from "../application/cases/list-sessions.case.js";
import { GetSessionReportCase } from "../application/cases/get-session.case.js";
import { ListSessionReportsCase } from "../application/cases/list-reports.case.js";
import { CompleteTurnCase } from "../application/cases/complete-turn.case.js";
import { EnvSttServiceFactory, EnvTtsServiceFactory } from "./voice/voice.factory.js";
import { VoiceTurnCase } from "../application/cases/voice.case.js";
import type { ISttService, ITtsService } from "../application/ports/services.js";
import { RealtimeEventHub } from "./realtime/event-hub.js";
import {
  AdapterLlmStreamServiceFactory,
  AdapterSttStreamServiceFactory,
  AdapterTtsStreamServiceFactory,
} from "./realtime/streaming.factory.js";
import { RealtimeVoiceCase } from "../application/cases/realtime-voice.case.js";
import { SynthesizeQuestionAudioCase } from "../application/cases/synthesize-question.case.js";
import { WebRtcRealtimeGateway } from "./realtime/webrtc.gateway.js";

export function buildContainer() {
  const templates = new PgInterviewTemplateRepository();
  const links = new PgInterviewAccessLinkRepository();
  const sessions = new PgInterviewSessionRepository();

  const clock = new SystemClock();
  const ids = new SystemIdGenerator();
  const tokenService = new Sha256TokenService();
  const llmFactory = new EnvLlmServiceFactory(process.env);
  const sttFactory = new EnvSttServiceFactory(process.env);
  const ttsFactory = new EnvTtsServiceFactory(process.env);
  const sttStreamFactory = new AdapterSttStreamServiceFactory(sttFactory);
  const ttsStreamFactory = new AdapterTtsStreamServiceFactory(ttsFactory);
  const llmStreamFactory = new AdapterLlmStreamServiceFactory(llmFactory);
  const realtimeHub = new RealtimeEventHub();
  const realtimeGateway = new WebRtcRealtimeGateway();

  const unavailableSttService: ISttService = {
    async transcribe() {
      throw new Error("VOICE_FEATURE_NOT_AVAILABLE");
    },
  };
  const unavailableTtsService: ITtsService = {
    async synthesize() {
      throw new Error("VOICE_FEATURE_NOT_AVAILABLE");
    },
  };

  const { sttService, ttsService } = (() => {
    try {
      return {
        sttService: sttFactory.forVoiceConfig(),
        ttsService: ttsFactory.forVoiceConfig(),
      };
    } catch {
      return {
        sttService: unavailableSttService,
        ttsService: unavailableTtsService,
      };
    }
  })();

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
  const synthesizeQuestionAudio = new SynthesizeQuestionAudioCase(sessions, templates, ttsFactory);
  const realtimeVoice = new RealtimeVoiceCase(
    sttStreamFactory.forVoiceConfig(),
    llmStreamFactory.forTemplate({ provider: "groq", model: "", temperature: 0.2, maxTokensPerTurn: 700 }),
    ttsStreamFactory.forVoiceConfig(),
    completeTurn
  );

  return {
    repositories: { templates, links, sessions },
    services: {
      clock,
      ids,
      tokenService,
      llmFactory,
      sttFactory,
      ttsFactory,
      sttService,
      ttsService,
      sttStreamFactory,
      ttsStreamFactory,
      llmStreamFactory,
      realtimeHub,
      realtimeGateway,
    },
    useCases: {
      createTemplate,
      createAccessLink,
      listAccessLinks,
      revokeAccessLink,
      startSession,
      submitAnswer,
      evaluateAnswer,
      completeSession,
      listSessions,
      getSessionReport,
      listSessionReports,
      completeTurn,
      voiceTurn,
      realtimeVoice,
      synthesizeQuestionAudio,
    },
  };
}