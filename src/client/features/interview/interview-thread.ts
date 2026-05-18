import type { InterviewAnswer, InterviewQuestion, InterviewSession } from "../../../lib/interview/types";

export type InterviewThreadMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
  questionId: string;
  source?: InterviewAnswer["source"];
};

export function buildThreadFromSession(session: InterviewSession): InterviewThreadMessage[] {
  const questions = session.questions ?? [];
  const answers = session.answers ?? [];
  const answerByQuestionId = new Map(answers.map((answer) => [answer.questionId, answer]));
  const messages: InterviewThreadMessage[] = [];

  for (const question of questions) {
    messages.push(toAssistantMessage(question));
    const answer = answerByQuestionId.get(question.id);
    if (answer?.text?.trim()) {
      messages.push(toUserMessage(answer));
    }
  }

  return messages;
}

export function resolveActiveQuestionId(messages: InterviewThreadMessage[]): string | null {
  let pending: string | null = null;

  for (const message of messages) {
    if (message.role === "assistant") {
      pending = message.questionId;
      continue;
    }
    if (message.role === "user" && message.questionId === pending) {
      pending = null;
    }
  }

  return pending;
}

export function initialThreadMessage(question: InterviewQuestion): InterviewThreadMessage {
  return toAssistantMessage(question);
}

function toAssistantMessage(question: InterviewQuestion): InterviewThreadMessage {
  return {
    id: `q:${question.id}`,
    role: "assistant",
    text: question.text,
    questionId: question.id,
  };
}

function toUserMessage(answer: InterviewAnswer): InterviewThreadMessage {
  return {
    id: `a:${answer.questionId}`,
    role: "user",
    text: answer.text,
    questionId: answer.questionId,
    source: answer.source,
  };
}