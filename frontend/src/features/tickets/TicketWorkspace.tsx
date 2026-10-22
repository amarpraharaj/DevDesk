import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  ArrowLeft,
  CalendarDays,
  CircleCheck,
  CircleDot,
  Clock3,
  Inbox,
  Search,
  Pencil,
  Trash2,
  Tag,
  Ticket as TicketIcon,
} from "lucide-react";
import type { Ticket, TicketPriority, TicketStatus } from "./ticket.types";

interface TicketWorkspaceProps {
  tickets: Ticket[];
  onCreateTicket?: () => void;
  onEditTicket?: (ticket: Ticket) => void;
  onDeleteTicket?: (ticket: Ticket) => void;
  isDeletingTicket?: boolean;
  onUpdateStatus?: (ticketId: string, status: TicketStatus) => void | Promise<void>;
  isUpdatingStatus?: boolean;
  updateError?: string | null;
}

const priorityStyles: Record<TicketPriority, string> = {
  high: "bg-[#F9E6E0] text-[#A44029]",
  medium: "bg-[#F5EDD7] text-[#826019]",
  low: "bg-[#DFEAE0] text-[#356148]",
};

const statusStyles: Record<TicketStatus, string> = {
  open: "text-[#464D8E]",
  "in-progress": "text-[#826019]",
  resolved: "text-[#356148]",
  closed: "text-[#656B63]",
};

const statusLabels: Record<TicketStatus, string> = {
  open: "Open",
  "in-progress": "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function TicketWorkspace({
  tickets,
  onCreateTicket,
  onEditTicket,
  onDeleteTicket,
  isDeletingTicket = false,
  onUpdateStatus,
  isUpdatingStatus = false,
  updateError = null,
}: TicketWorkspaceProps) {
  const [search, setSearch] = useState("");
  const [mobileView, setMobileView] = useState<"queue" | "detail">("queue");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    tickets[0]?.id ?? null,
  );

  const visibleTickets = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tickets;

    return tickets.filter((ticket) =>
      [ticket.id, ticket.title, ticket.description, ticket.priority, ticket.status]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [tickets, search]);

  const selectedTicket =
    visibleTickets.find((ticket) => ticket.id === selectedTicketId) ??
    visibleTickets[0] ??
    null;

  return (
    <section className="overflow-hidden border-y border-line bg-surface">
      <div className="flex flex-col justify-between gap-4 border-b border-line px-5 py-5 sm:flex-row sm:items-center sm:px-7">
        <div>
          <p className="mb-2 text-[10px] font-semibold tracking-[1.8px] text-muted">
            ISSUE OPERATIONS / WORKSPACE
          </p>
          <h2 className="text-2xl font-semibold tracking-[-0.9px]">
            Work queue<span className="text-accent">.</span>
          </h2>
          <p className="mt-1.5 text-xs text-muted">
            Inspect an issue without losing sight of the queue.
          </p>
        </div>
        {onCreateTicket && (
          <button
            type="button"
            onClick={onCreateTicket}
            className="inline-flex h-11 w-full items-center justify-center gap-2 self-start rounded-lg bg-accent px-4 text-xs font-medium text-white transition hover:bg-accent-hover focus-visible:outline-offset-4 sm:w-auto"
          >
            <TicketIcon size={15} />
            New ticket
          </button>
        )}
      </div>

      <div className="grid min-h-130 grid-cols-1 lg:grid-cols-[minmax(270px,0.83fr)_minmax(0,1.4fr)]">
        <div className={`min-w-0 border-b border-line lg:border-b-0 lg:border-r ${mobileView === "detail" ? "hidden lg:block" : ""}`}>
          <div className="flex items-center justify-between px-5 pb-3 pt-5">
            <span className="text-[10px] font-semibold tracking-[1.3px] text-muted">IN YOUR QUEUE</span>
            <span className="font-mono text-xs text-muted">{String(visibleTickets.length).padStart(2, "0")}</span>
          </div>
          <div className="px-4 pb-4">
            <label className="relative block">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Find an issue..."
                aria-label="Search tickets"
                className="h-11 w-full rounded-md border border-line bg-canvas pl-9 pr-3 text-sm outline-none transition placeholder:text-muted/80 focus:border-accent"
              />
            </label>
          </div>
          <div className="pb-2">
            {visibleTickets.map((ticket) => {
              const isSelected = selectedTicket?.id === ticket.id;
              return (
                <button
                  type="button"
                  key={ticket.id}
                  onClick={() => {
                    setSelectedTicketId(ticket.id);
                    setMobileView("detail");
                  }}
                  aria-pressed={isSelected}
                  className={`group relative w-full border-l-2 px-5 py-4 text-left transition ${isSelected ? "border-accent bg-[#F7F4ED]" : "border-transparent hover:bg-[#FAFAF7]"}`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] tracking-wide text-muted">{ticket.id}</span>
                    <span className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-[9px] font-semibold uppercase tracking-wide ${priorityStyles[ticket.priority]}`}>
                      <span className="size-1 rounded-full bg-current" />{ticket.priority}
                    </span>
                  </div>
                  <p className="text-[13px] font-semibold leading-5 text-ink">{ticket.title}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-muted">{ticket.description || "No description provided."}</p>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className={`inline-flex items-center gap-1.5 text-[10px] ${statusStyles[ticket.status]}`}>
                      {ticket.status === "resolved" || ticket.status === "closed" ? <CircleCheck size={12} /> : <CircleDot size={12} />}
                      {statusLabels[ticket.status]}
                    </span>
                    {isSelected && <ArrowUpRight size={14} className="text-accent" aria-hidden="true" />}
                  </div>
                </button>
              );
            })}
            {visibleTickets.length === 0 && (
              <div className="flex flex-col items-center px-6 py-12 text-center">
                <Inbox size={23} className="mb-3 text-muted" />
                <p className="text-sm font-medium">No matching issues</p>
                <p className="mt-1 text-xs leading-5 text-muted">Try a different search term.</p>
                <button type="button" onClick={() => setSearch("")} className="mt-3 text-xs font-medium text-accent hover:underline">Clear search</button>
              </div>
            )}
          </div>
        </div>

        <div className={`min-w-0 p-4 sm:p-7 ${mobileView === "queue" ? "hidden lg:block" : ""}`}>
          <div className="mb-4 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileView("queue")}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line px-3 text-sm font-medium text-ink transition hover:bg-canvas focus-visible:outline-offset-2"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              Back to queue
            </button>
          </div>
          {selectedTicket ? (
            <article aria-live="polite">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 font-mono text-[11px] text-muted"><TicketIcon size={14} />{selectedTicket.id}</span>
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${statusStyles[selectedTicket.status]}`}>
                    {selectedTicket.status === "resolved" || selectedTicket.status === "closed" ? <CircleCheck size={14} /> : <CircleDot size={14} />}
                    {statusLabels[selectedTicket.status]}
                  </span>
                  {onEditTicket && (
                    <button
                      type="button"
                      onClick={() => onEditTicket(selectedTicket)}
                      className="inline-flex h-11 items-center gap-2 rounded-md border border-line px-2.5 text-xs font-medium text-ink transition hover:bg-canvas focus-visible:outline-offset-2 sm:px-3"
                    >
                      <Pencil size={13} />
                      Edit ticket
                    </button>
                  )}
                  {onDeleteTicket && (
                    <button
                      type="button"
                      onClick={() => onDeleteTicket(selectedTicket)}
                      disabled={isDeletingTicket}
                      className="inline-flex h-11 items-center gap-2 rounded-md border border-[#E7B7AA] px-2.5 text-xs font-medium text-[#A44029] transition hover:bg-[#F9E6E0] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:px-3"
                    >
                      <Trash2 size={13} />
                      Delete ticket
                    </button>
                  )}
                </div>
              </div>
              <h3 className="max-w-xl text-[25px] font-semibold leading-tight tracking-[-0.9px] sm:text-[30px]">{selectedTicket.title}</h3>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-muted">{selectedTicket.description || "No description has been provided for this issue."}</p>

              <div className="mt-7 border-t border-line pt-5">
                <p className="mb-4 text-[10px] font-semibold tracking-[1.6px] text-muted">ISSUE PROPERTIES</p>
                <dl className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="flex items-center gap-2 text-xs text-muted"><Tag size={14} />Priority</dt>
                    <dd className={`rounded px-2.5 py-1 text-[10px] font-semibold uppercase ${priorityStyles[selectedTicket.priority]}`}>{selectedTicket.priority}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="flex items-center gap-2 text-xs text-muted"><CircleDot size={14} />Status</dt>
                    <dd>
                      {onUpdateStatus ? (
                        <select
                          aria-label={`Update status for ${selectedTicket.title}`}
                          value={selectedTicket.status}
                          disabled={isUpdatingStatus}
                          onChange={(event) => void onUpdateStatus(selectedTicket.id, event.target.value as TicketStatus)}
                          className="h-11 min-w-32 rounded-md border border-line bg-canvas px-2.5 text-xs text-ink outline-none transition focus:border-accent disabled:cursor-wait disabled:opacity-60"
                        >
                          <option value="open">Open</option>
                          <option value="in-progress">In progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                      ) : <span className="text-xs text-ink">{statusLabels[selectedTicket.status]}</span>}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="flex items-center gap-2 text-xs text-muted"><CalendarDays size={14} />Created</dt>
                    <dd className="text-xs text-ink">{formatDate(selectedTicket.createdAt)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="flex items-center gap-2 text-xs text-muted"><Clock3 size={14} />Last updated</dt>
                    <dd className="text-xs text-ink">{formatDate(selectedTicket.updatedAt)}</dd>
                  </div>
                </dl>
                {isUpdatingStatus && <p role="status" className="mt-3 text-xs text-muted">Updating ticket status…</p>}
                {updateError && <p role="alert" className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-800">{updateError}</p>}
              </div>

              <div className="mt-8 border-t border-line pt-5">
                <p className="text-[10px] font-semibold tracking-[1.6px] text-muted">ACTIVITY</p>
                <div className="mt-4 flex gap-3">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#E9D7CB] text-[10px] font-semibold text-[#713C29]">DD</div>
                  <div>
                    <p className="text-xs font-medium">Issue record</p>
                    <p className="mt-1 text-xs leading-5 text-muted">Detailed activity history will appear here when the API supports it.</p>
                  </div>
                </div>
              </div>
            </article>
          ) : (
            <div className="flex min-h-90 flex-col items-center justify-center text-center">
              <div className="mb-4 flex size-12 items-center justify-center rounded-full border border-line text-muted"><Inbox size={21} /></div>
              <h3 className="text-base font-semibold">Choose an issue</h3>
              <p className="mt-2 max-w-xs text-xs leading-5 text-muted">Select a ticket from the queue to inspect its details.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
