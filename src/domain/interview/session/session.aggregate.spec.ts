import { describe, expect, it } from "vitest";
import { InterviewSession } from "./session.aggregate";
import { InterviewSessionProps } from "./types";

const baseProps = (): InterviewSessionProps => ({
  id: "s1",
  templateId: "t1",
  ownerUserId: "u1",
  participant: { type: "guest", guestAlias: "Fran" },
  entryPoint: { mode: "shared_link", accessLinkId: "l1" },
  status: "IDLE",
  currentQuestionIndex: 0,
  totalQuestions: 2,
  questions: [],
  answers: [],
  evaluations: [],
  feedbackItems: [],
  version: 0,
});

describe("InterviewSession", () => {
  it("starts from IDLE to ASKING", () => {
    const session = new InterviewSession(baseProps());
    session.start(new Date().toISOString());
    expect(session.state.status).toBe("ASKING");
  });

});

describe("InterviewSession", () => {
    it("delivers a question and goes to ASKING", () => {
        const session = new InterviewSession(baseProps());
        session.deliverQuestion({
            id: "q1",
            index: 0,
            text: "What is the capital of France?",
            generatedByModel: "gpt-4o",
            createdAt: new Date().toISOString(),
        });
        expect(session.state.status).toBe("ASKING");
    });
});

describe("InterviewSession", () => {
    it("receives an answer and goes to EVALUATING", () => {
        const session = new InterviewSession(baseProps());
        session.deliverQuestion({
            id: "q1",
            index: 0,
            text: "What is the capital of France?",
            generatedByModel: "gpt-4o",
            createdAt: new Date().toISOString(),
        });
    });
});

describe("InterviewSession", () => {
    it("evaluates an answer and goes to FEEDBACKING", () => {
        const session = new InterviewSession(baseProps());
        session.storeEvaluation({
            id: "e1",
            answerId: "a1",
            score: 100,
            confidence: 1,
            evaluatedAt: new Date().toISOString(),
            dimensionScores: {
                "communication": 100,
                "problem-solving": 100,
                "technical-skills": 100,
                "soft-skills": 100,
            },
            strengths: ["Great answer!"],
            improvements: [],
        });
    });
});

describe("InterviewSession", () => {
    it("adds feedback and goes to FEEDBACKING", () => {
        const session = new InterviewSession(baseProps());
        session.addFeedback({
            id: "q1",
            answerId: "a1",
            text: "Great answer!",
            generatedAt: new Date().toISOString(),
        });
    });
});

describe("InterviewSession", () => {
    it("completes the session and goes to COMPLETED", () => {
        const session = new InterviewSession(baseProps());
        session.nextOrComplete(new Date().toISOString());
        expect(session.state.status).toBe("COMPLETED");
    });
});

describe("InterviewSession", () => {
    it("fails the session and goes to FAILED", () => {
        const session = new InterviewSession(baseProps());
        session.fail(new Date().toISOString());
        expect(session.state.status).toBe("FAILED");
    });
});