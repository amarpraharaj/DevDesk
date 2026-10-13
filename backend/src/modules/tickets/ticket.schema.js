
import { z } from "zod";

export const createTicketSchema = z.object({
    title: z
        .string()
        .trim()
        .min(1, "Title is required.")
        .max(120, "Title cannot exceed 120 characters."),

    description: z
        .string()
        .trim()
        .max(2000, "Description cannot exceed 2000 characters.")
        .optional(),

    priority: z
        .enum(["low", "medium", "high"])
        .default("medium"),
});


export const updateTicketSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "Title is required.")
      .max(120, "Title cannot exceed 120 characters.")
      .optional(),

    description: z
      .string()
      .trim()
      .max(2000, "Description cannot exceed 2000 characters.")
      .optional(),

    priority: z
      .enum(["low", "medium", "high"])
      .optional(),

    status: z
      .enum(["open", "in-progress", "resolved", "closed"])
      .optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    "At least one field must be provided."
  );
