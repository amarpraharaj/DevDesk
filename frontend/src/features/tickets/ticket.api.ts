import { apiRequest } from "../../lib/api";
import type {
  Ticket,
  TicketListResponse,
  TicketPriority,
  TicketStatus,
} from "./ticket.types";

export type CreateTicketInput = {
  title: string;
  description?: string;
  priority?: TicketPriority;
};

export type UpdateTicketInput = {
  title?: string;
  description?: string;
  priority?: TicketPriority;
  status?: TicketStatus;
};

export type TicketListParams = {
  page?: number;
  limit?: number;
  status?: TicketStatus;
  priority?: TicketPriority;
  search?: string;
  sortBy?: "createdAt" | "updatedAt" | "title" | "priority";
  sortOrder?: "asc" | "desc";
};

type TicketResponse = {
  success: true;
  message: string;
  data: {
    ticket: Ticket;
  };
};

type DeleteTicketResponse = {
  success: true;
  message: string;
};

export function getTickets(params: TicketListParams = {}) {
  const query = new URLSearchParams();

  if (params.page !== undefined) {
    query.set("page", String(params.page));
  }

  if (params.limit !== undefined) {
    query.set("limit", String(params.limit));
  }

  if (params.status) {
    query.set("status", params.status);
  }

  if (params.priority) {
    query.set("priority", params.priority);
  }

  const search = params.search?.trim();

  if (search) {
    query.set("search", search);
  }

  if (params.sortBy) {
    query.set("sortBy", params.sortBy);
  }

  if (params.sortOrder) {
    query.set("sortOrder", params.sortOrder);
  }

  const queryString = query.toString();
  const path = queryString ? `/tickets?${queryString}` : "/tickets";

  return apiRequest<TicketListResponse>(path);
}

export function createTicket(input: CreateTicketInput) {
  return apiRequest<TicketResponse>("/tickets", {
    method: "POST",
    body: input,
  });
}

export function updateTicket(ticketId: string, input: UpdateTicketInput) {
  return apiRequest<TicketResponse>(
    `/tickets/${encodeURIComponent(ticketId)}`,
    {
      method: "PUT",
      body: input,
    }
  );
}

export function deleteTicket(ticketId: string) {
  return apiRequest<DeleteTicketResponse>(
    `/tickets/${encodeURIComponent(ticketId)}`,
    {
      method: "DELETE",
    }
  );
}
