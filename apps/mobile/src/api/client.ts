import { API_BASE_URL } from "../utils/env";
import {
  ChangePasswordSchema,
  CredentialsSchema,
  DeleteAccountSchema,
  HealthResponseSchema,
  LogoutAllResponseSchema,
  LogoutResponseSchema,
  MeResponseSchema,
  MessageResponseSchema,
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
  method: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  accessToken?: string;
  validateWith: (json: unknown) => T;
}): Promise<T> {
  const headers: Record<string, string> = {};
  if (body != null) headers["Content-Type"] = "application/json";
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      0,
      null,
      `Cannot reach API at ${API_BASE_URL}. Is the gateway running?`,
    );
  }

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

export async function health(): Promise<{ status: string; service: string }> {
  return apiRequest({
    path: "/api/health",
    method: "GET",
    validateWith: (json) => HealthResponseSchema.parse(json),
  });
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

export async function logoutAll(
  accessToken: string,
): Promise<{ message: string; revoked: number }> {
  return apiRequest({
    path: "/api/logout-all",
    method: "POST",
    accessToken,
    validateWith: (json) => LogoutAllResponseSchema.parse(json),
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

export async function changePassword(
  accessToken: string,
  input: unknown,
): Promise<{ message: string }> {
  const body = ChangePasswordSchema.parse(input);
  return apiRequest({
    path: "/api/me/password",
    method: "PATCH",
    body,
    accessToken,
    validateWith: (json) => MessageResponseSchema.parse(json),
  });
}

export async function deleteAccount(
  accessToken: string,
  input: unknown,
): Promise<{ message: string }> {
  const body = DeleteAccountSchema.parse(input);
  return apiRequest({
    path: "/api/me",
    method: "DELETE",
    body,
    accessToken,
    validateWith: (json) => MessageResponseSchema.parse(json),
  });
}
