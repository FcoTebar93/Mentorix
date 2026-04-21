import { describe, expect, it } from "vitest";
import { InterviewSession } from "./session.aggregate.js";
import type { InterviewSessionProps } from "./types.js";

const NOW = "2026-04-20T10:00:00.000Z";

function baseProps(): InterviewSessionProps {
  return {
    id: "s1",
    templateId: "t1",
    ownerUserId: "u1",
    participant: { type: "guest", guestAlias: "Fran" },
    entryPoint: { mode: "shared_link", accessLinkId: "l1" },
    status: "IDLE",
    currentQuestionIndex: 0,
    totalQuestions: 1,
    questions: [],
    answers: [],
    evaluations: [],
    feedbackItems: [],
    version: 0,
  };
}

function buildSession() {
  return new InterviewSession(baseProps());
}

function moveToAsking(session: InterviewSession) {
  session.start(NOW);
}

function moveToEvaluating(session: InterviewSession) {
  session.start(NOW);
  session.deliverQuestion({
    id: "q1",
    index: 1,
    text: "Explain dependency inversion",
    generatedByModel: "test",
    createdAt: NOW,
  });
  session.receiveAnswer({
    id: "a1",
    questionId: "q1",
    source: "text",
    text: "High-level modules should depend on abstractions.",
    receivedAt: NOW,
  });
}

function moveToFeedbacking(session: InterviewSession) {
  moveToEvaluating(session);
  session.storeEvaluation({
    id: "e1",
    answerId: "a1",
    score: 82,
    dimensionScores: { architecture: 82 },
    strengths: ["good structure"],
    improvements: ["add deeper trade-offs"],
    confidence: 0.9,
    evaluatedAt: NOW,
  });
}

describe("InterviewSession", () => {
  it("starts from IDLE to ASKING", () => {
    const session = buildSession();

    session.start(NOW);

    expect(session.state.status).toBe("ASKING");
  });

  it("delivers a question in ASKING", () => {
    const session = buildSession();
    moveToAsking(session);

    session.deliverQuestion({
      id: "q1",
      index: 1,
      text: "What is SOLID?",
      generatedByModel: "test",
      createdAt: NOW,
    });

    expect(session.state.questions).toHaveLength(1);
    expect(session.state.status).toBe("ASKING");
  });

  it("receives an answer and goes to EVALUATING", () => {
    const session = buildSession();
    moveToAsking(session);
    session.deliverQuestion({
      id: "q1",
      index: 1,
      text: "Explain DRY",
      generatedByModel: "test",
      createdAt: NOW,
    });

    session.receiveAnswer({
      id: "a1",
      questionId: "q1",
      source: "text",
      text: "Avoid duplicated knowledge.",
      receivedAt: NOW,
    });

    expect(session.state.answers).toHaveLength(1);
    expect(session.state.status).toBe("EVALUATING");
  });

  it("stores evaluation and goes to FEEDBACKING", () => {
    const session = buildSession();
    moveToEvaluating(session);

    session.storeEvaluation({
      id: "e1",
      answerId: "a1",
      score: 80,
      dimensionScores: { clarity: 80 },
      strengths: ["clear explanation"],
      improvements: ["more practical examples"],
      confidence: 0.86,
      evaluatedAt: NOW,
    });

    expect(session.state.evaluations).toHaveLength(1);
    expect(session.state.status).toBe("FEEDBACKING");
  });

  it("adds feedback in FEEDBACKING", () => {
    const session = buildSession();
    moveToFeedbacking(session);

    session.addFeedback({
      id: "f1",
      answerId: "a1",
      text: "Great structure, improve depth.",
      generatedAt: NOW,
    });

    expect(session.state.feedbackItems).toHaveLength(1);
    expect(session.state.status).toBe("FEEDBACKING");
  });

  it("completes the session from FEEDBACKING when no more questions", () => {
    const session = buildSession();
    moveToFeedbacking(session);

    session.nextOrComplete(NOW);

    expect(session.state.status).toBe("COMPLETED");
    expect(session.state.endedAt).toBe(NOW);
  });

  it("fails the session and goes to FAILED", () => {
    const session = buildSession();

    session.fail(NOW);

    expect(session.state.status).toBe("FAILED");
    expect(session.state.endedAt).toBe(NOW);
  });
});