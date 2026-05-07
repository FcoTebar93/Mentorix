import { describe, it, expect } from "vitest";
import { humanizeError } from "./humanize";
import { HttpError } from "../api/client";

describe("humanizeError", () => {
  it("maps known LLM error code to human message and disables retry for config errors", () => {
    const err = new HttpError({
      status: 502,
      code: "LLM_API_KEY_INVALID",
      message: "Invalid API key",
    });
    const human = humanizeError(err);
    expect(human.title).toBe("Modelo no configurado");
    expect(human.retry).toBe(false);
    expect(human.fallbackToText).toBe(false);
    expect(human.technicalCode).toBe("LLM_API_KEY_INVALID");
  });

  it("flags fallbackToText for VOICE_FEATURE_NOT_AVAILABLE", () => {
    const err = new HttpError({
      status: 503,
      code: "VOICE_FEATURE_NOT_AVAILABLE",
      message: "Voice feature is not available",
    });
    const human = humanizeError(err);
    expect(human.fallbackToText).toBe(true);
    expect(human.retry).toBe(false);
  });

  it("groups all token errors under expired session", () => {
    const codes = ["TOKEN_EXPIRED", "TOKEN_INVALID", "TOKEN_REVOKED", "TOKEN_HASH_NOT_FOUND"];
    for (const code of codes) {
      const human = humanizeError(new HttpError({ status: 401, code, message: code }));
      expect(human.title).toBe("Sesión expirada");
      expect(human.technicalCode).toBe(code);
    }
  });

  it("translates browser mic permission errors", () => {
    const err = new Error("Permission denied");
    err.name = "NotAllowedError";
    const human = humanizeError(err);
    expect(human.title).toBe("Micrófono bloqueado");
    expect(human.fallbackToText).toBe(true);
    expect(human.retry).toBe(true);
  });

  it("translates failed network fetches", () => {
    const err = new TypeError("Failed to fetch");
    const human = humanizeError(err);
    expect(human.title).toBe("Sin conexión");
    expect(human.retry).toBe(true);
  });

  it("falls back to a generic message for unknown errors", () => {
    const human = humanizeError(new Error("Something exploded"));
    expect(human.title).toBe("Algo salió mal");
    expect(human.message).toBe("Something exploded");
    expect(human.retry).toBe(true);
  });

  it("falls back to a fully generic message for non-Error values", () => {
    const human = humanizeError("string error");
    expect(human.title).toBe("Algo salió mal");
    expect(human.retry).toBe(true);
  });
});
