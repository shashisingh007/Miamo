/**
 * Reusable zod primitives for cross-service request validation.
 * Keep schemas SMALL and composable — wider ones live next to their endpoint.
 */
import { z } from 'zod';

// Auth -------------------------------------------------
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Email too short')
  .max(254, 'Email too long')
  .email('Invalid email format');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long');

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, 'Display name required')
  .max(80, 'Display name too long');

export const registerBodySchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: displayNameSchema,
});

export const loginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});

export const refreshBodySchema = z.object({
  refreshToken: z.string().min(20).max(2048),
});

export const forgotPasswordBodySchema = z.object({
  email: emailSchema,
});

// Pagination ------------------------------------------
export const cursorQuerySchema = z.object({
  cursor: z.string().max(200).optional(),
  limit: z
    .union([z.string(), z.number()])
    .transform((v) => (typeof v === 'string' ? parseInt(v, 10) : v))
    .pipe(z.number().int().min(1).max(100))
    .optional(),
});

// IDs -------------------------------------------------
export const idParamSchema = z.object({ id: z.string().min(1).max(64) });
export const userIdParamSchema = z.object({ userId: z.string().min(1).max(64) });
