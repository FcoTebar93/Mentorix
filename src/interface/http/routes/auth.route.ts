import { z } from "zod";
import type { RegisterRoutes } from "./types.js";
import { parseUserIdFromAuthHeader } from "../auth.handler.js";

const LoginBodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type AuthUser = {
  id: string;
  email: string;
  name?: string;
  role?: "owner" | "recruiter" | "admin";
  password: string;
};

// TO DO: CHANGE TO REAL AUTH
const DEV_USERS: AuthUser[] = [
  {
    id: "u1",
    email: "owner@mentorix.dev",
    name: "Owner Demo",
    role: "owner",
    password: "123456",
  },
  {
    id: "u2",
    email: "recruiter@mentorix.dev",
    name: "Recruiter Demo",
    role: "recruiter",
    password: "123456",
  },
];

export const registerAuthRoutes: RegisterRoutes = (app) => {
  app.post("/v1/auth/login", async (request, reply) => {
    const parsedBody = LoginBodySchema.safeParse(request.body);
    if (!parsedBody.success) {
      return reply.code(400).send({
        code: "INVALID_BODY",
        message: "Invalid request body",
        details: parsedBody.error.flatten(),
      });
    }

    const { email, password } = parsedBody.data;
    const user = DEV_USERS.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    );

    if (!user) {
      return reply.code(401).send({
        code: "UNAUTHORIZED",
        message: "Invalid email or password",
      });
    }

    const accessToken = `test-user:${user.id}`;

    return reply.code(200).send({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  });

  app.get("/v1/auth/me", async (request, reply) => {
    const userId = parseUserIdFromAuthHeader(request.headers.authorization);
    if (!userId) {
      return reply.code(401).send({
        code: "UNAUTHORIZED",
        message: "Missing or invalid Authorization header",
      });
    }

    const user = DEV_USERS.find((u) => u.id === userId);
    if (!user) {
      return reply.code(401).send({
        code: "UNAUTHORIZED",
        message: "User not found for token",
      });
    }

    return reply.code(200).send({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  });
};