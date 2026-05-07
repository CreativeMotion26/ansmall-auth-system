import { z } from "zod";

export const UserSchema = z.object({
  id: z.number(),
  email: z.string().email(),
});

export type User = z.infer<typeof UserSchema>;

export const TokenBundleSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
  user: UserSchema,
});

export type TokenBundle = z.infer<typeof TokenBundleSchema>;

export const CredentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const RefreshRequestSchema = z.object({
  refreshToken: z.string().min(16),
});

export const LogoutResponseSchema = z.object({
  message: z.string(),
});

export const MeResponseSchema = z.object({
  user: UserSchema,
});

