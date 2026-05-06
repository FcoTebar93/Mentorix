import { describe, expect, it } from "vitest";
import { RealtimeVoiceCase } from "./realtime-voice.case.js";

describe("RealtimeVoiceCase", () => {
  it("streams llm and tts events from text input", async () => {
    const useCase = new RealtimeVoiceCase(
      {
        async *transcribeStream() {
          yield { type: "final", text: "hola" } as const;
        },
      },
      {
        async *streamText(text: string) {
          for (const token of text.split(" ")) {
            if (token) yield { type: "token", token: `${token} ` } as const;
          }
          yield { type: "done" } as const;
        },
      },
      {
        async *synthesizeStream() {
          yield { type: "chunk", audioBase64Chunk: "abc", chunkIndex: 0 } as const;
          yield { type: "done" } as const;
        },
      },
      {
        async execute() {
          return {
            isCompleted: false,
            nextQuestion: { id: "q2", text: "siguiente pregunta" },
          };
        },
      } as any
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
});
