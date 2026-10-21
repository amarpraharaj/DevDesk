
export type TicketPriority = "low" | "medium" | "high";

export type TicketStatus =
  | "open"
  | "in-progress"
  | "resolved"
  | "closed";

export interface Ticket {
  id: string;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TicketPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface TicketListResponse {
  success: boolean;
  data: {
    tickets: Ticket[];
    pagination: TicketPagination;
  };
}
