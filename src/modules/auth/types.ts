export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  role?: "owner" | "recruiter" | "admin";
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  user: AuthUser;
};