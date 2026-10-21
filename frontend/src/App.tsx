import "./App.css";
import { useEffect, useState, type SubmitEvent } from "react";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Command,
  Eye,
  EyeOff,
  Inbox,
  LayoutDashboard,
  LogOut,
  Moon,
  Plus,
  Search,
  Settings2,
  Sun,
  SunMoon,
  Ticket,
} from "lucide-react";

import { useAuth } from "./features/auth/useAuth";
import TicketWorkspace from "./features/tickets/TicketWorkspace";
import CreateTicketModal from "./components/tickets/CreateTicketModal";
import EditTicketModal from "./components/tickets/EditTicketModal";
import DeleteTicketModal from "./components/tickets/DeleteTicketModal";
import { createTicket, getTickets, updateTicket, type CreateTicketInput, type UpdateTicketInput } from "./features/tickets/ticket.api";
import { useTicketDeletion } from "./features/tickets/useTicketDeletion";
import type { Ticket as TicketRecord, TicketStatus } from "./features/tickets/ticket.types";

type Theme = "light" | "dark" | "system";
type AuthMode = "login" | "register";

const navigation = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "My tickets", icon: Inbox },
  { label: "All tickets", icon: Ticket },
  { label: "Activity", icon: Activity },
];

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

function App() {
  const {
    user,
    isLoading,
    error: sessionError,
    login,
    register,
    logout,
    clearError,
  } = useAuth();

  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem("devdesk-theme");

    return savedTheme === "light" ||
      savedTheme === "dark" ||
      savedTheme === "system"
      ? savedTheme
      : "system";
  });

  const [activePage, setActivePage] = useState("Overview");
  const [authMode, setAuthMode] = useState<AuthMode>("login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [ticketsError, setTicketsError] = useState<string | null>(null);
  const [ticketReloadKey, setTicketReloadKey] = useState(0);
  const [isCreateTicketOpen, setIsCreateTicketOpen] = useState(false);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [createTicketError, setCreateTicketError] = useState<string | null>(null);
  const [updatingTicketId, setUpdatingTicketId] = useState<string | null>(null);
  const [ticketUpdateError, setTicketUpdateError] = useState<string | null>(null);
  const [editingTicket, setEditingTicket] = useState<TicketRecord | null>(null);
  const [isEditTicketOpen, setIsEditTicketOpen] = useState(false);
  const [isSavingTicket, setIsSavingTicket] = useState(false);
  const [editTicketError, setEditTicketError] = useState<string | null>(null);

  const ticketDeletion = useTicketDeletion((ticket) => {
    setActionMessage(`Ticket "${ticket.title}" deleted successfully.`);
    setTicketsLoading(true);
    setTicketReloadKey((current) => current + 1);
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = () => {
      const isDark =
        theme === "dark" || (theme === "system" && mediaQuery.matches);

      document.documentElement.dataset.theme = isDark ? "dark" : "light";
    };

    applyTheme();
    localStorage.setItem("devdesk-theme", theme);

    mediaQuery.addEventListener("change", applyTheme);

    return () => {
      mediaQuery.removeEventListener("change", applyTheme);
    };
  }, [theme]);

 
useEffect(() => {
  const userId = user?.id

  if (!userId) return

  let cancelled = false

  async function loadTickets() {
    try {
      const allTickets: TicketRecord[] = []
      let page = 1

      while (true) {
        const response = await getTickets({
          page,
          limit: 100,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        })

        allTickets.push(...response.data.tickets)

        if (!response.data.pagination.hasNextPage) {
          break
        }

        page = response.data.pagination.page + 1
      }

      if (!cancelled) {
        setTickets(allTickets)
        setTicketsError(null)
      }
    } catch (error) {
      if (!cancelled) {
        setTickets([])
        setTicketsError(getErrorMessage(error))
      }
    } finally {
      if (!cancelled) {
        setTicketsLoading(false)
      }
    }
  }

  void loadTickets()

  return () => {
    cancelled = true
  }
}, [user?.id, ticketReloadKey])

  const ThemeIcon = theme === "light" ? Sun : theme === "dark" ? Moon : SunMoon;

  function switchAuthMode(mode: AuthMode) {
    setAuthMode(mode);
    setFormError(null);
    setFormSuccess(null);
    setPassword("");
    clearError();
  }

  async function handleAuthSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    setFormError(null);
    setFormSuccess(null);
    setIsSubmitting(true);
    clearError();

    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (authMode === "register") {
        await register({
          name: name.trim(),
          email: normalizedEmail,
          password,
        });

        setAuthMode("login");
        setPassword("");
        setFormSuccess(
          "Account created successfully. Sign in with your new account.",
        );
      } else {
        await login({
          email: normalizedEmail,
          password,
        });

        setPassword("");
        setActivePage("Overview");
      }
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleLogout() {
    setActionMessage(null);

    try {
      await logout();
      setActivePage("Overview");
      setFormSuccess(null);
      setPassword("");
    } catch (error) {
      setActionMessage(getErrorMessage(error));
    }
  }

  function openCreateTicket() {
    setCreateTicketError(null);
    setIsCreateTicketOpen(true);
  }

  async function handleCreateTicket(input: CreateTicketInput) {
    setIsCreatingTicket(true);
    setCreateTicketError(null);

    try {
      await createTicket(input);
      setIsCreateTicketOpen(false);
      setActionMessage("Ticket created successfully.");
      setTicketsLoading(true);
      setTicketReloadKey((current) => current + 1);
    } catch (error) {
      setCreateTicketError(getErrorMessage(error));
    } finally {
      setIsCreatingTicket(false);
    }
  }

  async function handleUpdateTicketStatus(ticketId: string, status: TicketStatus) {
    setUpdatingTicketId(ticketId);
    setTicketUpdateError(null);

    try {
      await updateTicket(ticketId, { status });
      setActionMessage("Ticket status updated successfully.");
      setTicketReloadKey((current) => current + 1);
    } catch (error) {
      setTicketUpdateError(getErrorMessage(error));
    } finally {
      setUpdatingTicketId(null);
    }
  }

  function openEditTicket(ticket: TicketRecord) {
    setEditingTicket(ticket);
    setEditTicketError(null);
    setIsEditTicketOpen(true);
  }

  function closeEditTicket() {
    if (isSavingTicket) return;
    setIsEditTicketOpen(false);
    setEditingTicket(null);
    setEditTicketError(null);
  }

  async function handleEditTicket(input: UpdateTicketInput) {
    if (!editingTicket) return;

    setIsSavingTicket(true);
    setEditTicketError(null);

    try {
      await updateTicket(editingTicket.id, input);
      setActionMessage("Ticket updated successfully.");
      setIsEditTicketOpen(false);
      setEditingTicket(null);
      setTicketReloadKey((current) => current + 1);
    } catch (error) {
      setEditTicketError(getErrorMessage(error));
    } finally {
      setIsSavingTicket(false);
    }
  }

  // Wait until the initial session check finishes.
  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas text-ink">
        <div className="flex flex-col items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-accent text-white">
            <Command size={24} />
          </div>

          <p className="text-sm text-muted">Loading your workspace…</p>

          <div className="h-1 w-40 overflow-hidden rounded-full bg-surface-raised">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-accent" />
          </div>
        </div>
      </main>
    );
  }

  // Unauthenticated view: login and registration.
  if (!user) {
    return (
      <main className="min-h-screen bg-canvas text-ink">
        <header className="flex items-center justify-between gap-4 px-5 py-5 md:px-10">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-white">
              <Command size={20} />
            </span>

            <span>
              <span className="block font-semibold tracking-tight">
                DevDesk
              </span>
              <span className="block text-xs text-muted">
                Personal workspace
              </span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="auth-theme" className="sr-only">
              Appearance
            </label>

            <ThemeIcon size={17} className="text-muted" />

            <select
              id="auth-theme"
              value={theme}
              onChange={(event) => setTheme(event.target.value as Theme)}
              className="max-w-36 rounded-lg border border-line bg-surface px-2 py-2 text-sm text-ink"
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </header>

        <div className="devdesk-enter mx-auto grid min-h-[calc(100vh-88px)] max-w-6xl items-center gap-10 px-5 pb-10 pt-4 lg:grid-cols-2 lg:gap-16 lg:px-10">
          <section className="hidden lg:block">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
              Work, with clarity
            </p>

            <h1 className="mt-5 max-w-xl text-5xl font-semibold leading-[1.12] tracking-tight">
              Keep every task moving forward.
            </h1>

            <p className="mt-5 max-w-lg text-base leading-7 text-muted">
              A focused workspace to organise tickets, follow priorities, and
              keep track of the work that matters.
            </p>

            <div className="mt-10 space-y-5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-success-soft text-success-ink">
                  <CheckCircle2 size={17} />
                </span>

                <div>
                  <p className="font-medium">One organised workspace</p>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    Keep requests and ongoing work in one place.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-success-soft text-success-ink">
                  <Ticket size={17} />
                </span>

                <div>
                  <p className="font-medium">Clear ticket ownership</p>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    Know what needs your attention next.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mx-auto w-full max-w-md">
            <div className="glass-panel rounded-2xl border border-line p-6 shadow-sm sm:p-8">
              <div className="mb-7 lg:hidden">
                <h1 className="text-2xl font-semibold tracking-tight">
                  Your work, organised.
                </h1>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Sign in to continue to your workspace.
                </p>
              </div>

              <div className="mb-7 hidden lg:block">
                <h2 className="text-2xl font-semibold tracking-tight">
                  {authMode === "login"
                    ? "Welcome back"
                    : "Create your account"}
                </h2>

                <p className="mt-2 text-sm leading-6 text-muted">
                  {authMode === "login"
                    ? "Sign in to pick up where you left off."
                    : "Get started with your personal workspace."}
                </p>
              </div>

              <div
                className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-surface-raised p-1"
                aria-label="Authentication options"
              >
                <button
                  type="button"
                  onClick={() => switchAuthMode("login")}
                  aria-pressed={authMode === "login"}
                  className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    authMode === "login"
                      ? "bg-surface text-ink shadow-sm"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  Sign in
                </button>

                <button
                  type="button"
                  onClick={() => switchAuthMode("register")}
                  aria-pressed={authMode === "register"}
                  className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    authMode === "register"
                      ? "bg-surface text-ink shadow-sm"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  Create account
                </button>
              </div>

              {(formError || sessionError) && (
                <div
                  role="alert"
                  className="mb-5 rounded-lg border border-priority-high/30 bg-priority-high/10 px-4 py-3 text-sm text-priority-high"
                >
                  {formError ?? sessionError}
                </div>
              )}

              {formSuccess && (
                <div
                  role="status"
                  className="mb-5 rounded-lg border border-line bg-surface-raised px-4 py-3 text-sm text-ink"
                >
                  {formSuccess}
                </div>
              )}

              <form
                onSubmit={(event) => void handleAuthSubmit(event)}
                className="space-y-4"
              >
                {authMode === "register" && (
                  <div>
                    <label
                      htmlFor="register-name"
                      className="mb-2 block text-sm font-medium"
                    >
                      Full name
                    </label>

                    <input
                      id="register-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      required
                      minLength={2}
                      maxLength={80}
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Your name"
                      className="w-full rounded-lg border border-line bg-surface px-3.5 py-3 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label
                    htmlFor="auth-email"
                    className="mb-2 block text-sm font-medium"
                  >
                    Email address
                  </label>

                  <input
                    id="auth-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-line bg-surface px-3.5 py-3 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label
                      htmlFor="auth-password"
                      className="block text-sm font-medium"
                    >
                      Password
                    </label>

                    {authMode === "login" && (
                      <span className="text-xs text-muted">
                        Your account password
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <input
                      id="auth-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete={
                        authMode === "login"
                          ? "current-password"
                          : "new-password"
                      }
                      required
                      minLength={authMode === "register" ? 8 : 1}
                      maxLength={72}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder={
                        authMode === "register"
                          ? "At least 8 characters"
                          : "Enter your password"
                      }
                      className="w-full rounded-lg border border-line bg-surface py-3 pl-3.5 pr-12 text-sm text-ink placeholder:text-muted focus:border-accent focus:outline-none"
                    />

                    <button
                      type="button"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-muted transition-colors hover:text-ink"
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                {authMode === "register" && (
                  <p className="text-xs leading-5 text-muted">
                    Your password must contain 8–72 characters.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting
                    ? "Please wait…"
                    : authMode === "login"
                      ? "Sign in"
                      : "Create account"}

                  {!isSubmitting && <ArrowRight size={17} />}
                </button>
              </form>

              <p className="mt-6 text-center text-xs leading-5 text-muted">
                Your session uses an HttpOnly authentication cookie.
              </p>
            </div>

            <p className="mt-5 text-center text-xs text-muted">
              DevDesk · A focused workspace for your work
            </p>
          </section>
        </div>
      </main>
    );
  }

  // Authenticated view: dashboard.
  return (
    <div className="min-h-screen bg-canvas text-ink md:flex">
      <aside className="glass-panel flex w-full shrink-0 flex-col border-b border-line bg-surface md:sticky md:top-0 md:h-screen md:w-64 md:border-r md:border-b-0">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex size-9 items-center justify-center rounded-xl bg-accent text-white shadow-sm">
            <Command size={19} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-semibold tracking-tight">DevDesk</p>
            <p className="text-xs text-muted">Personal workspace</p>
          </div>

          <button
            type="button"
            aria-label="Workspace options"
            onClick={() =>
              setActionMessage("Workspace options are coming soon.")
            }
            className="rounded-lg p-2 text-muted transition-colors duration-200 hover:bg-canvas hover:text-ink"
          >
            <ChevronDown size={17} />
          </button>
        </div>

        <div className="px-3 pb-4">
          <button
            type="button"
            onClick={() => setActivePage("All tickets")}
            className="flex w-full items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm text-muted transition-colors duration-200 hover:bg-canvas hover:text-ink"
          >
            <Search size={16} />
            <span className="flex-1 text-left">Search workspace</span>
            <span className="rounded border border-line px-1.5 py-0.5 text-xs">
              /
            </span>
          </button>
        </div>

        <div className="px-3">
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-muted">
            Workspace
          </p>

          <nav aria-label="Main navigation" className="space-y-1">
            {navigation.map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  setActivePage(label);
                  setActionMessage(null);
                }}
                aria-current={activePage === label ? "page" : undefined}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors duration-200 ${
                  activePage === label
                    ? "bg-canvas font-medium text-ink shadow-sm"
                    : "text-muted hover:bg-canvas hover:text-ink"
                }`}
              >
                <Icon size={17} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto space-y-1 p-3">
          <button
            type="button"
            onClick={() =>
              setActionMessage("Help and support will be added soon.")
            }
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted transition-colors duration-200 hover:bg-canvas hover:text-ink"
          >
            <CircleHelp size={17} />
            Help and support
          </button>

          <button
            type="button"
            onClick={() => setActionMessage("Settings are coming soon.")}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted transition-colors duration-200 hover:bg-canvas hover:text-ink"
          >
            <Settings2 size={17} />
            Settings
          </button>

          <div className="border-t border-line pt-3">
            <label
              htmlFor="dashboard-theme"
              className="mb-2 flex items-center gap-2 px-2 text-xs font-medium text-muted"
            >
              <ThemeIcon size={15} />
              Appearance
            </label>

            <select
              id="dashboard-theme"
              value={theme}
              onChange={(event) => setTheme(event.target.value as Theme)}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink transition-colors duration-200"
            >
              <option value="system">System default</option>
              <option value="light">Light mode</option>
              <option value="dark">Dark mode</option>
            </select>
          </div>

          <div className="flex items-center gap-3 rounded-lg px-2 py-3 transition-colors duration-200 hover:bg-canvas/60">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-success-soft text-sm font-semibold text-success-ink">
              {user.name.trim().charAt(0).toUpperCase() || "U"}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted">{user.email}</p>
            </div>

            <button
              type="button"
              aria-label="Sign out"
              title="Sign out"
              onClick={() => void handleLogout()}
              className="rounded-lg p-2 text-muted transition-colors hover:bg-canvas hover:text-ink"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      <main className="min-w-0 flex-1">
        <header className="glass-panel sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-line px-5 py-4 md:px-8">
          <div>
            <p className="text-xs text-muted">Workspace / {activePage}</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">
              {activePage}
            </h1>
          </div>

          <button
            type="button"
            onClick={openCreateTicket}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-accent px-3.5 py-2.5 text-sm font-medium text-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-accent-hover hover:shadow-md active:translate-y-0"
          >
            <Plus size={17} />
            <span className="hidden sm:inline">New ticket</span>
            <span className="sm:hidden">New</span>
          </button>
        </header>

        <div className="devdesk-enter mx-auto max-w-6xl p-5 md:p-8">
          {actionMessage && (
            <div
              role="status"
              className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-line bg-surface px-4 py-3 text-sm"
            >
              <p className="leading-6">{actionMessage}</p>

              <button
                type="button"
                aria-label="Dismiss message"
                onClick={() => setActionMessage(null)}
                className="text-muted hover:text-ink"
              >
                ×
              </button>
            </div>
          )}

          {activePage === "Overview" ? (
            <>
              <div className="mb-8">
                <p className="text-sm text-muted">Your work, in one place.</p>

                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                  Good to have you here, {user.name.split(" ")[0]}.
                </h2>

                <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
                  Keep track of requests, stay on top of priorities, and move
                  work forward without losing context.
                </p>
              </div>

              {ticketsError && (
                <div
                  role="alert"
                  className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm"
                >
                  <p className="text-ink">
                    Could not load tickets: {ticketsError}
                  </p>
                  <button
                    type="button"
                    onClick={() => setTicketReloadKey((current) => current + 1)}
                    className="rounded-lg border border-line px-3 py-2 font-medium hover:bg-canvas"
                  >
                    Try again
                  </button>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <section className="glass-panel hover-lift rounded-panel border border-line bg-surface p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted">My open tickets</p>
                    <Inbox size={18} className="text-muted" />
                  </div>
                  <p className="mt-5 text-3xl font-semibold">
                    {ticketsLoading
                      ? "…"
                      : ticketsError
                        ? "—"
                        : tickets.filter((ticket) => ticket.status === "open")
                            .length}
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    {ticketsError
                      ? "Unable to load ticket data"
                      : "Open tickets in your workspace"}
                  </p>
                </section>

                <section className="glass-panel hover-lift rounded-panel border border-line bg-surface p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted">In progress</p>
                    <Activity size={18} className="text-muted" />
                  </div>
                  <p className="mt-5 text-3xl font-semibold">
                    {ticketsLoading
                      ? "…"
                      : ticketsError
                        ? "—"
                        : tickets.filter(
                            (ticket) => ticket.status === "in-progress",
                          ).length}
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    {ticketsError
                      ? "Unable to load ticket data"
                      : "Tickets currently in progress"}
                  </p>
                </section>

                <section className="glass-panel hover-lift rounded-panel border border-line bg-surface p-5 sm:col-span-2 xl:col-span-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted">Resolved</p>
                    <CheckCircle2 size={18} className="text-muted" />
                  </div>
                  <p className="mt-5 text-3xl font-semibold">
                    {ticketsLoading
                      ? "…"
                      : ticketsError
                        ? "—"
                        : tickets.filter(
                            (ticket) => ticket.status === "resolved",
                          ).length}
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    {ticketsError
                      ? "Unable to load ticket data"
                      : "Resolved tickets in your workspace"}
                  </p>
                </section>
              </div>

              <section className="glass-panel hover-lift mt-6 rounded-panel border border-line bg-surface p-6">
                <div className="flex items-start gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-success-soft text-success-ink">
                    <Ticket size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold">Your workspace is ready</h3>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                      Your account and ticket data are connected. Use the work
                      queue to inspect the tickets stored in your workspace.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActivePage("All tickets")}
                      className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-accent transition-colors hover:text-accent-hover"
                    >
                      Explore tickets <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              </section>
            </>
          ) : activePage === "My tickets" || activePage === "All tickets" ? (
            <>
              {ticketsError ? (
                <section
                  role="alert"
                  className="rounded-panel border border-line bg-surface p-6 md:p-8"
                >
                  <h2 className="text-lg font-semibold">
                    Tickets could not be loaded
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {ticketsError}
                  </p>
                  <button
                    type="button"
                    onClick={() => setTicketReloadKey((current) => current + 1)}
                    className="mt-5 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
                  >
                    Try again
                  </button>
                </section>
              ) : ticketsLoading ? (
                <section
                  role="status"
                  className="rounded-panel border border-line bg-surface p-8"
                >
                  <p className="text-sm text-muted">Loading your tickets…</p>
                  <div className="mt-4 h-1 w-40 overflow-hidden rounded-full bg-surface-raised">
                    <div className="h-full w-1/2 animate-pulse rounded-full bg-accent" />
                  </div>
                </section>
              ) : (
                <TicketWorkspace
                  tickets={tickets}
                  onCreateTicket={openCreateTicket}
                  onEditTicket={openEditTicket}
                  onDeleteTicket={ticketDeletion.open}
                  isDeletingTicket={ticketDeletion.isDeleting}
                  onUpdateStatus={handleUpdateTicketStatus}
                  isUpdatingStatus={updatingTicketId !== null}
                  updateError={ticketUpdateError}
                />
              )}
            </>
          ) : (
            <section className="glass-panel rounded-panel border border-line bg-surface p-6 md:p-8">
              <div className="flex size-11 items-center justify-center rounded-xl bg-surface-raised">
                <Activity size={21} />
              </div>
              <h2 className="mt-5 text-xl font-semibold tracking-tight">
                Activity
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
                Ticket activity and recent updates are not available yet because
                the backend does not currently expose an activity history
                endpoint.
              </p>
            </section>
          )}
        </div>
      </main>

      <CreateTicketModal
        isOpen={isCreateTicketOpen}
        onClose={() => setIsCreateTicketOpen(false)}
        onSubmit={handleCreateTicket}
        isSubmitting={isCreatingTicket}
        error={createTicketError}
      />

      {isEditTicketOpen && editingTicket && (
        <EditTicketModal
          key={editingTicket.id}
          isOpen={isEditTicketOpen}
          ticket={editingTicket}
          onClose={closeEditTicket}
          onSubmit={handleEditTicket}
          isSubmitting={isSavingTicket}
          error={editTicketError}
        />
      )}

      {ticketDeletion.isOpen && ticketDeletion.ticket && (
        <DeleteTicketModal
          ticket={ticketDeletion.ticket}
          onClose={ticketDeletion.close}
          onConfirm={ticketDeletion.confirm}
          isDeleting={ticketDeletion.isDeleting}
          error={ticketDeletion.error}
        />
      )}
    </div>
  );
}

export default App;
