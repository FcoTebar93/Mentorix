import type { FastifyReply, FastifyRequest } from "fastify";

export type AuthenticatedUser = {
  id: string;
};

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

export function parseUserIdFromAuthHeader(authHeader?: string): string | null {
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) return null;

  if (!token.startsWith("test-user:")) return null;
  const userId = token.slice("test-user:".length).trim();

  return userId.length > 0 ? userId : null;
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const userId = parseUserIdFromAuthHeader(request.headers.authorization);
  if (!userId) {
    return reply.code(401).send({
      code: "UNAUTHORIZED",
      message: "Missing or invalid Authorization header",
    });
  }

  request.user = { id: userId };
}