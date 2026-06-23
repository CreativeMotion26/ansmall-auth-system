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

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export const DeleteAccountSchema = z.object({
  password: z.string().min(1),
});

export const MessageResponseSchema = z.object({
  message: z.string(),
});

export const LogoutResponseSchema = MessageResponseSchema;

export const LogoutAllResponseSchema = z.object({
  message: z.string(),
  revoked: z.number(),
});

export const HealthResponseSchema = z.object({
  status: z.string(),
  service: z.string(),
});

export const MeResponseSchema = z.object({
  user: UserSchema,
});
