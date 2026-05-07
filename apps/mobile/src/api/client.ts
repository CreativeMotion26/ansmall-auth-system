import { API_BASE_URL } from "../utils/env";
import {
  CredentialsSchema,
  LogoutResponseSchema,
  MeResponseSchema,
  RefreshRequestSchema,
  TokenBundleSchema,
  type TokenBundle,
} from "../schemas/auth";

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, data: unknown, message = "Request failed") {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function parseJsonSafe(text: string): Promise<unknown> {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function apiRequest<T>({
  path,
  method,
  body,
  accessToken,
  validateWith,
}: {
  path: string;
  method: "GET" | "POST";
  body?: unknown;
  accessToken?: string;
  validateWith: (json: unknown) => T;
}): Promise<T> {
  const headers: Record<string, string> = {};
  if (body != null) headers["Content-Type"] = "application/json";
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const json = await parseJsonSafe(text);

  if (!res.ok) {
    const maybeError = json && typeof json === "object" ? (json as any) : null;
    const message =
      maybeError?.error && typeof maybeError.error === "string"
        ? maybeError.error
        : "Request failed";
    throw new ApiError(res.status, json, message);
  }

  return validateWith(json);
}

export async function register(input: unknown): Promise<TokenBundle> {
  const body = CredentialsSchema.parse(input);
  return apiRequest({
    path: "/api/register",
    method: "POST",
    body,
    validateWith: (json) => TokenBundleSchema.parse(json),
  });
}

export async function login(input: unknown): Promise<TokenBundle> {
  const body = CredentialsSchema.parse(input);
  return apiRequest({
    path: "/api/login",
    method: "POST",
    body,
    validateWith: (json) => TokenBundleSchema.parse(json),
  });
}

export async function refresh(input: unknown): Promise<TokenBundle> {
  const body = RefreshRequestSchema.parse(input);
  return apiRequest({
    path: "/api/refresh",
    method: "POST",
    body,
    validateWith: (json) => TokenBundleSchema.parse(json),
  });
}

export async function logout(input: unknown): Promise<{ message: string }> {
  const body = RefreshRequestSchema.parse(input);
  return apiRequest({
    path: "/api/logout",
    method: "POST",
    body,
    validateWith: (json) => LogoutResponseSchema.parse(json),
  });
}

export async function me(accessToken: string): Promise<{
  user: { id: number; email: string };
}> {
  return apiRequest({
    path: "/api/me",
    method: "GET",
    accessToken,
    validateWith: (json) => MeResponseSchema.parse(json),
  });
}

