import { HttpError } from "../api/client";

export type HumanError = {
  title: string;
  message: string;
  retry: boolean;
  fallbackToText: boolean;
  technicalCode?: string;
};

const GENERIC: HumanError = {
  title: "Algo salió mal",
  message: "Ocurrió un error inesperado. Vuelve a intentarlo.",
  retry: true,
  fallbackToText: false,
};

const CODE_MAP: Record<string, Omit<HumanError, "technicalCode">> = {
  LLM_API_KEY_INVALID: {
    title: "Modelo no configurado",
    message: "El modelo de IA no está disponible en este momento. Avisa al equipo.",
    retry: false,
    fallbackToText: false,
  },
  LLM_API_KEY_MISSING: {
    title: "Modelo no configurado",
    message: "Falta la configuración del modelo de IA. Avisa al equipo.",
    retry: false,
    fallbackToText: false,
  },
  LLM_MODEL_NOT_FOUND: {
    title: "Modelo no disponible",
    message: "El modelo de IA configurado no está accesible. Avisa al equipo.",
    retry: false,
    fallbackToText: false,
  },
  LLM_QUESTION_GENERATION_FAILED: {
    title: "Error generando la pregunta",
    message: "No se pudo generar la siguiente pregunta. Intenta de nuevo.",
    retry: true,
    fallbackToText: false,
  },
  LLM_EVALUATION_FAILED: {
    title: "Error evaluando tu respuesta",
    message: "No se pudo procesar la evaluación. Intenta de nuevo.",
    retry: true,
    fallbackToText: false,
  },
  VOICE_FEATURE_NOT_AVAILABLE: {
    title: "Voz no disponible",
    message: "El servicio de voz no está activo. Puedes responder por texto.",
    retry: false,
    fallbackToText: true,
  },
  VOICE_TRANSCRIPTION_EMPTY: {
    title: "No se entendió el audio",
    message: "Vuelve a grabar más cerca del micrófono o cambia a modo texto.",
    retry: true,
    fallbackToText: true,
  },
  SESSION_NOT_FOUND: {
    title: "Sesión no encontrada",
    message: "Esta sesión ya no está disponible.",
    retry: false,
    fallbackToText: false,
  },
  TEMPLATE_NOT_FOUND: {
    title: "Entrevista no encontrada",
    message: "No se encontró la entrevista solicitada.",
    retry: false,
    fallbackToText: false,
  },
  QUESTION_NOT_FOUND: {
    title: "Pregunta no encontrada",
    message: "No se pudo localizar la pregunta actual. Recarga la página.",
    retry: false,
    fallbackToText: false,
  },
  ACCESS_LINK_NOT_FOUND: {
    title: "Link no válido",
    message: "El link de acceso no existe.",
    retry: false,
    fallbackToText: false,
  },
  ACCESS_LINK_EXPIRED: {
    title: "Link expirado",
    message: "Este link ha caducado. Pide uno nuevo al organizador.",
    retry: false,
    fallbackToText: false,
  },
  ACCESS_LINK_NOT_ACTIVE: {
    title: "Link no activo",
    message: "Este link ya no está activo.",
    retry: false,
    fallbackToText: false,
  },
  ACCESS_LINK_MAX_USES_REACHED: {
    title: "Link agotado",
    message: "Este link alcanzó el máximo de usos.",
    retry: false,
    fallbackToText: false,
  },
  INVALID_BODY: {
    title: "Datos inválidos",
    message: "Algunos datos no son válidos. Revísalos y vuelve a intentar.",
    retry: false,
    fallbackToText: false,
  },
  INVALID_PARAMS: {
    title: "Parámetros inválidos",
    message: "Algunos datos de la solicitud no son válidos.",
    retry: false,
    fallbackToText: false,
  },
  INVALID_STATE_TRANSITION: {
    title: "Acción no permitida",
    message: "La sesión no acepta esta acción en su estado actual.",
    retry: false,
    fallbackToText: false,
  },
  UNAUTHORIZED: {
    title: "Sin autorización",
    message: "Tu sesión expiró o no tiene permiso. Vuelve a iniciar.",
    retry: false,
    fallbackToText: false,
  },
  FORBIDDEN: {
    title: "Acceso denegado",
    message: "No tienes permiso para esta acción.",
    retry: false,
    fallbackToText: false,
  },
  RUBRIC_DIMENSIONS_REQUIRED: {
    title: "Datos incompletos",
    message: "Faltan dimensiones de evaluación.",
    retry: false,
    fallbackToText: false,
  },
};

const TOKEN_CODES = new Set([
  "TOKEN_INVALID",
  "TOKEN_EXPIRED",
  "TOKEN_REVOKED",
  "TOKEN_NOT_FOUND",
  "TOKEN_HASH_INVALID",
  "TOKEN_HASH_EXPIRED",
  "TOKEN_HASH_REVOKED",
  "TOKEN_HASH_NOT_FOUND",
  "INVALID_TOKEN",
]);

const BROWSER_NAME_MAP: Record<string, Omit<HumanError, "technicalCode">> = {
  NotAllowedError: {
    title: "Micrófono bloqueado",
    message: "Permite el acceso al micrófono en el navegador o usa el modo texto.",
    retry: true,
    fallbackToText: true,
  },
  NotFoundError: {
    title: "Sin micrófono detectado",
    message: "Conecta un micrófono o responde por texto.",
    retry: true,
    fallbackToText: true,
  },
  NotReadableError: {
    title: "Micrófono ocupado",
    message: "Otra aplicación está usando el micrófono. Ciérrala e intenta de nuevo.",
    retry: true,
    fallbackToText: true,
  },
  OverconstrainedError: {
    title: "Micrófono incompatible",
    message: "El micrófono no soporta los requisitos. Prueba con otro o usa texto.",
    retry: false,
    fallbackToText: true,
  },
  AbortError: {
    title: "Operación cancelada",
    message: "La operación se interrumpió. Intenta de nuevo.",
    retry: true,
    fallbackToText: false,
  },
};

function isNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    err.name === "TypeError" &&
    (msg.includes("failed to fetch") || msg.includes("networkerror") || msg.includes("load failed"))
  );
}

export function humanizeError(err: unknown): HumanError {
  if (err instanceof HttpError) {
    if (TOKEN_CODES.has(err.code)) {
      return {
        title: "Sesión expirada",
        message: "Tu acceso ya no es válido. Vuelve a iniciar.",
        retry: false,
        fallbackToText: false,
        technicalCode: err.code,
      };
    }
    const mapped = CODE_MAP[err.code];
    if (mapped) return { ...mapped, technicalCode: err.code };
    return {
      ...GENERIC,
      message: err.message || GENERIC.message,
      technicalCode: err.code,
    };
  }

  if (isNetworkError(err)) {
    return {
      title: "Sin conexión",
      message: "No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.",
      retry: true,
      fallbackToText: false,
      technicalCode: "NETWORK_ERROR",
    };
  }

  if (err instanceof DOMException || (err instanceof Error && BROWSER_NAME_MAP[err.name])) {
    const mapped = BROWSER_NAME_MAP[err.name];
    if (mapped) return { ...mapped, technicalCode: err.name };
  }

  if (err instanceof Error && err.message) {
    return { ...GENERIC, message: err.message };
  }

  return GENERIC;
}
