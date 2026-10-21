import type { Ticket } from "./ticket.types";

export const demoTickets: Ticket[] = [
  {
    id: "DEV-124",
    title: "Implement password reset flow",
    description:
      "Users need a secure way to recover access to their account when they forget their password.",
    priority: "high",
    status: "open",
    createdAt: "2026-10-13T08:00:00.000Z",
    updatedAt: "2026-10-13T10:15:00.000Z",
  },
  {
    id: "DEV-123",
    title: "Fix mixed-case email registration",
    description:
      "Registration should normalize email addresses before checking for existing accounts.",
    priority: "high",
    status: "in-progress",
    createdAt: "2026-10-12T09:00:00.000Z",
    updatedAt: "2026-10-13T09:30:00.000Z",
  },
  {
    id: "DEV-121",
    title: "Preserve filters when revisiting the queue",
    description:
      "Keep the selected filters and search query when users return from an issue detail view.",
    priority: "medium",
    status: "open",
    createdAt: "2026-10-11T11:30:00.000Z",
    updatedAt: "2026-10-12T14:00:00.000Z",
  },
  {
    id: "DEV-118",
    title: "Improve the first-visit empty state",
    description:
      "Help new users understand how to create their first ticket when their workspace is empty.",
    priority: "low",
    status: "resolved",
    createdAt: "2026-10-10T08:00:00.000Z",
    updatedAt: "2026-10-12T16:00:00.000Z",
  },
];
