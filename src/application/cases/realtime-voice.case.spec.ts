import { describe, expect, it } from "vitest";
import { RealtimeVoiceCase } from "./realtime-voice.case.js";

const sttStub = {
  async *transcribeStream() {
    yield { type: "final" as const, text: "hola" };
  },
};

const llmStub = {
  async *streamText(text: string) {
    for (const token of text.split(" ")) {
      if (token) yield { type: "token" as const, token: `${token} ` };
    }
    yield { type: "done" as const };
  },
};

const ttsStub = {
  async *synthesizeStream() {
    yield { type: "chunk" as const, audioBase64Chunk: "abc", chunkIndex: 0 };
    yield { type: "done" as const };
  },
};

function makeCompleteTurnStub(nextQuestion: { id: string; text: string; source?: "llm" | "fixed" } | null) {
  return {
    async execute() {
      return {
        isCompleted: nextQuestion === null,
        nextQuestion,
      };
    },
  } as any;
}

describe("RealtimeVoiceCase", () => {
  it("streams llm and tts events when next question source is llm", async () => {
    const useCase = new RealtimeVoiceCase(
      sttStub,
      llmStub,
      ttsStub,
      makeCompleteTurnStub({ id: "q2", text: "siguiente pregunta", source: "llm" })
    );

    const events: string[] = [];
    for await (const event of useCase.execute({
      sessionId: "s1",
      questionId: "q1",
      locale: "es-ES",
      answerText: "respuesta",
      rubricDimensions: [{ key: "clarity", weight: 1 }],
    })) {
      events.push(event.type);
    }

    expect(events).toContain("llm_token");
    expect(events).toContain("tts_chunk");
    expect(events).toContain("turn_completed");
  });

  it("falls back to streaming llm tokens when source is undefined (legacy sessions)", async () => {
    const useCase = new RealtimeVoiceCase(
      sttStub,
      llmStub,
      ttsStub,
      makeCompleteTurnStub({ id: "q2", text: "legacy" })
    );

    const events: string[] = [];
    for await (const event of useCase.execute({
      sessionId: "s1",
      questionId: "q1",
      locale: "es-ES",
      answerText: "respuesta",
      rubricDimensions: [{ key: "clarity", weight: 1 }],
    })) {
      events.push(event.type);
    }

    expect(events).toContain("llm_token");
  });

  it("skips llm_token events but still emits tts when next question source is fixed", async () => {
    const useCase = new RealtimeVoiceCase(
      sttStub,
      llmStub,
      ttsStub,
      makeCompleteTurnStub({ id: "q2", text: "Pregunta fija del banco", source: "fixed" })
    );

    const events: string[] = [];
    for await (const event of useCase.execute({
      sessionId: "s1",
      questionId: "q1",
      locale: "es-ES",
      answerText: "respuesta",
      rubricDimensions: [{ key: "clarity", weight: 1 }],
    })) {
      events.push(event.type);
    }

    expect(events).not.toContain("llm_token");
    expect(events).not.toContain("llm_done");
    expect(events).toContain("tts_chunk");
    expect(events).toContain("tts_done");
    expect(events).toContain("turn_completed");
  });

  it("does not emit tts events when there is no next question (session completed)", async () => {
    const useCase = new RealtimeVoiceCase(sttStub, llmStub, ttsStub, makeCompleteTurnStub(null));

    const events: string[] = [];
    for await (const event of useCase.execute({
      sessionId: "s1",
      questionId: "q1",
      locale: "es-ES",
      answerText: "respuesta",
      rubricDimensions: [{ key: "clarity", weight: 1 }],
    })) {
      events.push(event.type);
    }

    expect(events).not.toContain("llm_token");
    expect(events).not.toContain("tts_chunk");
    expect(events).toContain("turn_completed");
  });
});
