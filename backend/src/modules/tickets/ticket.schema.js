
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
