import { InvalidStateTransitionError } from "../../../domain/interview/session/errors.js";

export type HttpErrorShape = {
  statusCode: number;
  code: string;
  message: string;
};

export function mapErrorToHttp(error: unknown): HttpErrorShape {
  if (error instanceof InvalidStateTransitionError) {
    return {
      statusCode: 409,
      code: "INVALID_STATE_TRANSITION",
      message: error.message,
    };
  }

  if (error instanceof Error) {
    switch (error.message) {
      case "INVALID_BODY":
        return { statusCode: 400, code: "INVALID_BODY", message: "Invalid request body" };
      case "INVALID_PARAMS":
        return { statusCode: 400, code: "INVALID_PARAMS", message: "Invalid route params" };
      case "INVALID_QUERY":
        return { statusCode: 400, code: "INVALID_QUERY", message: "Invalid query params" };
      case "INVALID_TOKEN":
        return { statusCode: 401, code: "INVALID_TOKEN", message: "Invalid token" };
      case "TOKEN_EXPIRED":
        return { statusCode: 401, code: "TOKEN_EXPIRED", message: "Token expired" };
      case "TOKEN_REVOKED":
        return { statusCode: 401, code: "TOKEN_REVOKED", message: "Token revoked" };
      case "TOKEN_NOT_FOUND":
        return { statusCode: 401, code: "TOKEN_NOT_FOUND", message: "Token not found" };
      case "TOKEN_INVALID":
        return { statusCode: 401, code: "TOKEN_INVALID", message: "Token invalid" };
      case "TOKEN_HASH_INVALID":
        return { statusCode: 401, code: "TOKEN_HASH_INVALID", message: "Token hash invalid" };
      case "TOKEN_HASH_EXPIRED":
        return { statusCode: 401, code: "TOKEN_HASH_EXPIRED", message: "Token hash expired" };
      case "TOKEN_HASH_REVOKED":
        return { statusCode: 401, code: "TOKEN_HASH_REVOKED", message: "Token hash revoked" };
      case "TOKEN_HASH_NOT_FOUND":
        return { statusCode: 401, code: "TOKEN_HASH_NOT_FOUND", message: "Token hash not found" };
      case "TOKEN_HASH_INVALID":
        return { statusCode: 401, code: "TOKEN_HASH_INVALID", message: "Token hash invalid" };
      case "UNAUTHORIZED":
        return { statusCode: 401, code: "UNAUTHORIZED", message: "Unauthorized" };
      case "FORBIDDEN":
        return { statusCode: 403, code: "FORBIDDEN", message: "Forbidden" };
      case "ACCESS_LINK_NOT_ACTIVE":
        return { statusCode: 403, code: "ACCESS_LINK_NOT_ACTIVE", message: "Access link not active" };
      case "ACCESS_LINK_NOT_FOUND":
        return { statusCode: 404, code: "ACCESS_LINK_NOT_FOUND", message: "Access link not found" };
      case "ACCESS_LINK_EXPIRED":
        return { statusCode: 403, code: "ACCESS_LINK_EXPIRED", message: "Access link expired" };
      case "ACCESS_LINK_MAX_USES_REACHED":
        return { statusCode: 403, code: "ACCESS_LINK_MAX_USES_REACHED", message: "Access link max uses reached" };
      case "SESSION_NOT_FOUND":
        return { statusCode: 404, code: "SESSION_NOT_FOUND", message: "Session not found" };
      case "TEMPLATE_NOT_FOUND":
        return { statusCode: 404, code: "TEMPLATE_NOT_FOUND", message: "Template not found" };
      case "RUBRIC_DIMENSIONS_REQUIRED":
        return {
          statusCode: 400,
          code: "RUBRIC_DIMENSIONS_REQUIRED",
          message: "Rubric dimensions are required",
        };
      case "LLM_EVALUATION_FAILED":
        return {
          statusCode: 502,
          code: "LLM_EVALUATION_FAILED",
          message: "LLM provider evaluation failed",
        };
      case "LLM_QUESTION_GENERATION_FAILED":
        return {
          statusCode: 502,
          code: "LLM_QUESTION_GENERATION_FAILED",
          message: "LLM provider question generation failed",
        };
      case "LLM_API_KEY_INVALID":
        return {
          statusCode: 502,
          code: "LLM_API_KEY_INVALID",
          message: "Invalid API key for configured LLM provider",
        };
      case "LLM_MODEL_NOT_FOUND":
        return {
          statusCode: 502,
          code: "LLM_MODEL_NOT_FOUND",
          message: "Configured LLM model was not found",
        };
      case "LLM_API_KEY_MISSING":
        return {
          statusCode: 502,
          code: "LLM_API_KEY_MISSING",
          message: "Missing API key for configured LLM provider",
        };
      case "VOICE_FEATURE_NOT_AVAILABLE":
      case "OPENAI_STT_PROVIDER_NOT_IMPLEMENTED":
      case "OPENAI_TTS_PROVIDER_NOT_IMPLEMENTED":
      case "CUSTOM_STT_PROVIDER_NOT_IMPLEMENTED":
      case "CUSTOM_TTS_PROVIDER_NOT_IMPLEMENTED":
      case "VOICE_PROVIDER_NOT_CONFIGURED":
        return {
          statusCode: 503,
          code: "VOICE_FEATURE_NOT_AVAILABLE",
          message: "Voice feature is not available in this environment",
        };
      case "VOICE_TRANSCRIPTION_EMPTY":
        return {
          statusCode: 422,
          code: "VOICE_TRANSCRIPTION_EMPTY",
          message: "Could not transcribe a valid answer from audio",
        };
      default:
        break;
    }
  }

  return {
    statusCode: 500, code: "INTERNAL_ERROR", message: "Unexpected server error",
  };
}