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
  view: "active" | "all";
  onCreateTicket?: () => void;
  onViewAllTickets?: () => void;
  onViewActivity?: () => void;
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

const priorityRank: Record<TicketPriority, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

const activePriorityBorder: Record<TicketPriority, string> = {
  high: "border-l-[#A44029]",
  medium: "border-l-[#B18A35]",
  low: "border-l-[#568268]",
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
  view,
  onCreateTicket,
  onViewAllTickets,
  onViewActivity,
  onEditTicket,
  onDeleteTicket,
  isDeletingTicket = false,
  onUpdateStatus,
  isUpdatingStatus = false,
  updateError = null,
}: TicketWorkspaceProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | "all">("all");
  const [sortBy, setSortBy] = useState<"createdAt" | "updatedAt" | "title" | "priority">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [mobileView, setMobileView] = useState<"queue" | "detail">("queue");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
    tickets[0]?.id ?? null,
  );

  const activeTickets = useMemo(
    () => tickets.filter((ticket) => ticket.status === "open" || ticket.status === "in-progress"),
    [tickets],
  );
  const priorityCounts = useMemo(
    () => ({
      high: activeTickets.filter((ticket) => ticket.priority === "high").length,
      medium: activeTickets.filter((ticket) => ticket.priority === "medium").length,
      low: activeTickets.filter((ticket) => ticket.priority === "low").length,
    }),
    [activeTickets],
  );

  const filteredTickets = useMemo(() => {
    const query = search.trim().toLowerCase();
    const source = view === "active" ? activeTickets : tickets;

    return source
      .filter((ticket) => view === "active" || statusFilter === "all" || ticket.status === statusFilter)
      .filter((ticket) => view === "active" || priorityFilter === "all" || ticket.priority === priorityFilter)
      .filter((ticket) =>
        !query || [ticket.id, ticket.title, ticket.description, ticket.priority, ticket.status]
          .join(" ")
          .toLowerCase()
          .includes(query),
          )
          .sort((left, right) => {
            if (view === "active") {
              const rankDifference = priorityRank[right.priority] - priorityRank[left.priority];
              return rankDifference || right.createdAt.localeCompare(left.createdAt);
            }

            const compared = sortBy === "priority"
              ? priorityRank[left.priority] - priorityRank[right.priority]
          : String(left[sortBy]).localeCompare(String(right[sortBy]));
        return sortOrder === "asc" ? compared : -compared;
      });
  }, [activeTickets, priorityFilter, search, sortBy, sortOrder, statusFilter, tickets, view]);

  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleTickets = filteredTickets.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const selectedTicket =
    visibleTickets.find((ticket) => ticket.id === selectedTicketId) ??
    visibleTickets[0] ??
    null;

  if (view === "active" && activeTickets.length === 0) {
    return (
      <section className="rounded-panel border border-line bg-surface px-6 py-14 text-center sm:px-10">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-surface-raised text-muted">
          <Inbox size={25} aria-hidden="true" />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-accent">Active work</p>
        <h2 className="mt-2 text-xl font-semibold">You’re all caught up</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
          There are no open or in-progress tickets right now. Check All Tickets for resolved work or create a new ticket.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          {onViewAllTickets && (
            <button type="button" onClick={onViewAllTickets} className="min-h-11 rounded-lg border border-line px-4 text-sm font-medium hover:bg-canvas focus-visible:outline-offset-2">
              View all tickets
            </button>
          )}
          {onCreateTicket && (
            <button type="button" onClick={onCreateTicket} className="min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover focus-visible:outline-offset-2">
              Create a ticket
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="overflow-hidden border-y border-line bg-surface">
      <div className="flex flex-col justify-between gap-4 border-b border-line px-5 py-5 sm:flex-row sm:items-center sm:px-7">
        <div>
          <p className="mb-2 text-[10px] font-semibold tracking-[1.8px] text-muted">
            {view === "active" ? "MY WORK / ACTIVE QUEUE" : "ISSUE OPERATIONS / WORKSPACE"}
          </p>
          <h2 className="text-2xl font-semibold tracking-[-0.9px]">
            {view === "active" ? "Active tickets" : "All tickets"}<span className="text-accent">.</span>
          </h2>
          <p className="mt-1.5 text-xs text-muted">
            {view === "active"
              ? "Focus on open work, ordered by priority."
              : "Search, filter, and review every ticket in your workspace."}
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

      {view === "active" ? (
        <div className="grid gap-px border-b border-line bg-line sm:grid-cols-4">
          <div className="bg-surface px-5 py-4 sm:px-7">
            <p className="text-xs text-muted">Active tickets</p>
            <p className="mt-1 text-2xl font-semibold">{activeTickets.length}</p>
          </div>
          {(["high", "medium", "low"] as const).map((priority) => (
            <div key={priority} className="bg-surface px-5 py-4 sm:px-7">
              <p className="text-xs capitalize text-muted">{priority} priority</p>
              <p className={`mt-1 text-2xl font-semibold ${priority === "high" ? "text-[#A44029]" : priority === "medium" ? "text-[#826019]" : "text-[#356148]"}`}>
                {priorityCounts[priority]}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-3 border-b border-line bg-canvas p-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="sr-only" htmlFor="ticket-search">Search tickets</label>
          <input
            id="ticket-search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search tickets..."
            className="h-11 min-w-0 rounded-md border border-line bg-surface px-3 text-sm outline-none focus:border-accent"
          />
          <label className="sr-only" htmlFor="ticket-status-filter">Filter by status</label>
          <select id="ticket-status-filter" value={statusFilter} onChange={(event) => {
            setStatusFilter(event.target.value as TicketStatus | "all");
            setPage(1);
          }} className="h-11 min-w-0 rounded-md border border-line bg-surface px-3 text-sm">
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="in-progress">In progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <label className="sr-only" htmlFor="ticket-priority-filter">Filter by priority</label>
          <select id="ticket-priority-filter" value={priorityFilter} onChange={(event) => {
            setPriorityFilter(event.target.value as TicketPriority | "all");
            setPage(1);
          }} className="h-11 min-w-0 rounded-md border border-line bg-surface px-3 text-sm">
            <option value="all">All priorities</option>
            <option value="high">High priority</option>
            <option value="medium">Medium priority</option>
            <option value="low">Low priority</option>
          </select>
          <div className="flex gap-2">
            <label className="sr-only" htmlFor="ticket-sort">Sort tickets by</label>
            <select id="ticket-sort" value={sortBy} onChange={(event) => {
              setSortBy(event.target.value as typeof sortBy);
              setPage(1);
            }} className="h-11 min-w-0 flex-1 rounded-md border border-line bg-surface px-3 text-sm">
              <option value="createdAt">Created date</option>
              <option value="updatedAt">Updated date</option>
              <option value="title">Title</option>
              <option value="priority">Priority</option>
            </select>
            <label className="sr-only" htmlFor="ticket-sort-order">Sort direction</label>
            <select id="ticket-sort-order" value={sortOrder} onChange={(event) => {
              setSortOrder(event.target.value as "asc" | "desc");
              setPage(1);
            }} className="h-11 rounded-md border border-line bg-surface px-2 text-sm">
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </div>
        </div>
      )}

      <div className="grid min-h-130 grid-cols-1 lg:grid-cols-[minmax(270px,0.83fr)_minmax(0,1.4fr)]">
        <div className={`min-w-0 border-b border-line lg:border-b-0 lg:border-r ${mobileView === "detail" ? "hidden lg:block" : ""}`}>
          <div className="flex items-center justify-between px-5 pb-3 pt-5">
            <span className="text-[10px] font-semibold tracking-[1.3px] text-muted">{view === "active" ? "ACTIVE QUEUE" : "MATCHING TICKETS"}</span>
            <span className="font-mono text-xs text-muted">{String(filteredTickets.length).padStart(2, "0")}</span>
          </div>
          {view === "active" && <div className="px-4 pb-4">
            <label className="relative block">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Find an issue..."
                aria-label="Search tickets"
                className="h-11 w-full rounded-md border border-line bg-canvas pl-9 pr-3 text-sm outline-none transition placeholder:text-muted/80 focus:border-accent"
              />
            </label>
          </div>}
          <div className={view === "active" ? "space-y-2 px-3 pb-3" : "pb-2"}>
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
                  className={view === "active"
                    ? `group relative w-full rounded-lg border border-l-4 px-4 py-4 text-left transition ${activePriorityBorder[ticket.priority]} ${isSelected ? "border-line bg-[#F7F4ED] shadow-sm" : "border-line bg-canvas hover:bg-[#FAFAF7]"}`
                    : `group relative w-full border-l-2 px-5 py-3 text-left transition ${isSelected ? "border-accent bg-[#F7F4ED]" : "border-transparent hover:bg-[#FAFAF7]"}`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] tracking-wide text-muted">
                      {view === "active" ? (ticket.priority === "high" ? "PRIORITY · HIGH" : ticket.priority === "medium" ? "PRIORITY · MEDIUM" : "PRIORITY · LOW") : ticket.id}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 rounded px-2 py-1 text-[9px] font-semibold uppercase tracking-wide ${priorityStyles[ticket.priority]}`}>
                      <span className="size-1 rounded-full bg-current" />{ticket.priority}
                    </span>
                  </div>
                  <p className="text-[13px] font-semibold leading-5 text-ink">{ticket.title}</p>
                  {view === "active" && (
                    <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-muted">
                      {ticket.description || "No description provided."}
                    </p>
                  )}
                  <div className={`${view === "active" ? "mt-3" : "mt-2"} flex items-center justify-between gap-2`}>
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
                <p className="text-sm font-medium">No tickets match</p>
                <p className="mt-1 text-xs leading-5 text-muted">Adjust the search or filters to see more tickets.</p>
                <button type="button" onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setPriorityFilter("all");
                  setPage(1);
                }} className="mt-3 text-xs font-medium text-accent hover:underline">Clear search and filters</button>
              </div>
            )}
          </div>
          {filteredTickets.length > pageSize && (
            <nav aria-label="Ticket pages" className="flex items-center justify-between border-t border-line px-4 py-3">
              <span className="text-xs text-muted">Page {currentPage} of {totalPages}</span>
              <div className="flex gap-2">
                <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} className="min-h-10 rounded-md border border-line px-3 text-xs disabled:opacity-50">Previous</button>
                <button type="button" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} className="min-h-10 rounded-md border border-line px-3 text-xs disabled:opacity-50">Next</button>
              </div>
            </nav>
          )}
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
                  <div className="min-w-0">
                    <p className="text-xs font-medium">Issue record</p>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      View the paginated activity history for your workspace.
                    </p>
                    {onViewActivity && (
                      <button
                        type="button"
                        onClick={onViewActivity}
                        className="mt-2 text-xs font-medium text-accent hover:text-accent-hover"
                      >
                        View activity history
                      </button>
                    )}
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
