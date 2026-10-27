import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must contain at least 2 characters.")
    .max(80, "Name cannot exceed 80 characters."),

  email: z
    .string()
    .trim()
    .email("Please provide a valid email address.")
    .transform((value) => value.toLowerCase()),

  password: z
    .string()
    .min(8, "Password must contain at least 8 characters.")
    .max(72, "Password cannot exceed 72 characters."),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please provide a valid email address.")
    .transform((value) => value.toLowerCase()),

  password: z
    .string()
    .min(1, "Password is required.")
    .max(72, "Invalid credentials."),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please provide a valid email address.")
    .transform((value) => value.toLowerCase()),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required."),

  password: z
    .string()
    .min(8, "Password must contain at least 8 characters.")
    .max(72, "Password cannot exceed 72 characters.")
    .regex(/[a-z]/, "Password must contain a lowercase letter.")
    .regex(/[A-Z]/, "Password must contain an uppercase letter.")
    .regex(/[0-9]/, "Password must contain a number.")
    .regex(
      /[^A-Za-z0-9\s]/,
      "Password must contain a special character.",
    ),
});

export const deleteAccountSchema = z.object({
  currentPassword: z
    .string()
    .min(1, "Current password is required.")
    .max(72, "Current password is invalid."),
  confirmation: z
    .string()
    .refine((value) => value === "DELETE", "Type DELETE to confirm account deletion."),
});