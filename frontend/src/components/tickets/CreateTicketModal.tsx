import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import type { CreateTicketInput } from "../../features/tickets/ticket.api";

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateTicketInput) => void | Promise<void>;
  isSubmitting?: boolean;
  error?: string | null;
}

export default function CreateTicketModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
  error = null,
}: CreateTicketModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<CreateTicketInput["priority"]>("medium");
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setValidationError("Enter a title for this ticket.");
      return;
    }

    if (trimmedTitle.length > 120) {
      setValidationError("The title must be 120 characters or fewer.");
      return;
    }

    if (description.trim().length > 2000) {
      setValidationError("The description must be 2,000 characters or fewer.");
      return;
    }

    setValidationError(null);
    await onSubmit({
      title: trimmedTitle,
      description: description.trim(),
      priority: priority ?? "medium",
    });
  }

  function handleClose() {
    if (isSubmitting) return;
    onClose();
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
        aria-labelledby="create-ticket-title"
        className="w-full max-w-lg rounded-xl border border-line bg-surface p-5 shadow-2xl sm:p-7"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-[10px] font-semibold tracking-[1.6px] text-muted">
              ISSUE OPERATIONS / NEW RECORD
            </p>
            <h2 id="create-ticket-title" className="text-2xl font-semibold tracking-[-0.8px]">
              Create a ticket<span className="text-accent">.</span>
            </h2>
            <p className="mt-2 text-xs leading-5 text-muted">
              Describe the issue and choose its priority.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Close create ticket form"
            className="rounded-md p-2 text-muted transition hover:bg-canvas hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="ticket-title" className="mb-2 block text-xs font-medium text-ink">
              Title <span className="text-accent">*</span>
            </label>
            <input
              id="ticket-title"
              autoFocus
              required
              maxLength={120}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Unable to update profile"
              className="h-11 w-full rounded-md border border-line bg-canvas px-3 text-sm outline-none transition placeholder:text-muted/80 focus:border-accent"
            />
            <p className="mt-1.5 text-right text-[10px] text-muted">{title.length}/120</p>
          </div>

          <div>
            <label htmlFor="ticket-description" className="mb-2 block text-xs font-medium text-ink">
              Description <span className="font-normal text-muted">(optional)</span>
            </label>
            <textarea
              id="ticket-description"
              rows={4}
              maxLength={2000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Add details that will help you resolve this issue..."
              className="w-full resize-y rounded-md border border-line bg-canvas px-3 py-2.5 text-sm leading-6 outline-none transition placeholder:text-muted/80 focus:border-accent"
            />
            <p className="mt-1.5 text-right text-[10px] text-muted">{description.length}/2000</p>
          </div>

          <div>
            <label htmlFor="ticket-priority" className="mb-2 block text-xs font-medium text-ink">
              Priority
            </label>
            <select
              id="ticket-priority"
              value={priority ?? "medium"}
              onChange={(event) => setPriority(event.target.value as CreateTicketInput["priority"])}
              className="h-11 w-full rounded-md border border-line bg-canvas px-3 text-sm outline-none transition focus:border-accent"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          {(validationError || error) && (
            <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-800">
              {validationError ?? error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-line pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="h-10 rounded-lg border border-line px-4 text-xs font-medium text-ink transition hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-10 rounded-lg bg-accent px-4 text-xs font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Creating ticket..." : "Create ticket"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
