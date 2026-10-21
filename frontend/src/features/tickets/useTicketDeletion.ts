import { useState } from "react";
import { deleteTicket } from "./ticket.api";
import type { Ticket } from "./ticket.types";

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

export function useTicketDeletion(onDeleted: (ticket: Ticket) => void) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function open(ticketToDelete: Ticket) {
    setTicket(ticketToDelete);
    setError(null);
    setIsOpen(true);
  }

  function close() {
    if (isDeleting) return;
    setIsOpen(false);
    setTicket(null);
    setError(null);
  }

  async function confirm() {
    if (!ticket || isDeleting) return;

    const ticketToDelete = ticket;
    setIsDeleting(true);
    setError(null);

    try {
      await deleteTicket(ticketToDelete.id);
      setIsOpen(false);
      setTicket(null);
      onDeleted(ticketToDelete);
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setIsDeleting(false);
    }
  }

  return { ticket, isOpen, isDeleting, error, open, close, confirm };
}
