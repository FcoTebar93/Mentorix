import { SessionAnswer, SessionEvaluation, SessionQuestion } from "../../domain/interview/session/types";

export interface TokenService {
  generateSecureToken(): Promise<string>;
  hash(rawToken: string): Promise<string>;
}

export interface Clock {
  nowISO(): string;
}

export interface IdGenerator {
  uuid(): string;
}

export interface ILlmService {
  generateQuestion(input: {
    role: string;
    level: "junior" | "mid" | "senior";
    language: string;
    previousQuestions: string[];
  }): Promise<SessionQuestion>;

  evaluateAnswer(input: {
    question: string;
    answer: SessionAnswer;
    rubric: { dimensions: { key: string; weight: number }[] };
  }): Promise<SessionEvaluation>;
}

export interface IVoiceService {
  transcribe(input: { audioBase64: string; locale: string }): Promise<{ text: string }>;
  synthesize(input: { text: string; locale: string }): Promise<{ audioBase64: string }>;
}