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
      case "SESSION_NOT_FOUND":
        return { statusCode: 404, code: "SESSION_NOT_FOUND", message: "Session not found" };
      case "ACCESS_LINK_NOT_FOUND":
        return { statusCode: 404, code: "ACCESS_LINK_NOT_FOUND", message: "Access link not found" };
      case "ACCESS_LINK_NOT_ACTIVE":
      case "ACCESS_LINK_EXPIRED":
      case "ACCESS_LINK_MAX_USES_REACHED":
        return { statusCode: 410, code: error.message, message: "Access link not valid" };
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
      default:
        break;
    }
  }

  return {
    statusCode: 500, code: "INTERNAL_ERROR", message: "Unexpected server error",
  };
}