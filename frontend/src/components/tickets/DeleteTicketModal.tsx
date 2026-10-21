import { AlertTriangle, Trash2, X } from "lucide-react";
import type { Ticket } from "../../features/tickets/ticket.types";

interface DeleteTicketModalProps {
  ticket: Ticket;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  isDeleting?: boolean;
  error?: string | null;
}

export default function DeleteTicketModal({
  ticket,
  onClose,
  onConfirm,
  isDeleting = false,
  error = null,
}: DeleteTicketModalProps) {
  function handleClose() {
    if (!isDeleting) onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-ticket-title"
        aria-describedby="delete-ticket-description"
        className="w-full max-w-md rounded-xl border border-line bg-surface p-5 shadow-2xl sm:p-7"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#F9E6E0] text-[#A44029]">
              <AlertTriangle size={19} />
            </span>
            <div>
              <p className="mb-1.5 text-[10px] font-semibold tracking-[1.6px] text-muted">
                ISSUE OPERATIONS / DELETE RECORD
              </p>
              <h2 id="delete-ticket-title" className="text-xl font-semibold tracking-[-0.6px]">
                Delete ticket<span className="text-accent">?</span>
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            aria-label="Close delete confirmation"
            className="rounded-md p-2 text-muted transition hover:bg-canvas hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <p id="delete-ticket-description" className="text-sm leading-6 text-muted">
          This will permanently delete the selected ticket. This action cannot be undone.
        </p>

        <div className="mt-5 rounded-lg border border-line bg-canvas px-4 py-3">
          <p className="font-mono text-[10px] text-muted">{ticket.id}</p>
          <p className="mt-1 break-words text-sm font-semibold text-ink">{ticket.title}</p>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-800">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            className="h-10 rounded-lg border border-line px-4 text-xs font-medium text-ink transition hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={isDeleting}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#A44029] px-4 text-xs font-medium text-white transition hover:bg-[#863522] disabled:cursor-wait disabled:opacity-60"
          >
            <Trash2 size={14} />
            {isDeleting ? "Deleting ticket…" : "Delete permanently"}
          </button>
        </div>
      </section>
    </div>
  );
}
