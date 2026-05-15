"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

import type { Claim } from "@/lib/claim-shared";
import type { LostItem, LostItemFilter } from "@/lib/lost-item-shared";
import { isItemOwner } from "@/lib/lost-item-shared";
import { ItemCard } from "./item-card";
import ThemeToggle from "./theme-toggle";

type HomePageProps = {
  items: LostItem[];
};

const typeFilters: Array<{ label: string; value: LostItemFilter }> = [
  { label: "All", value: "all" },
  { label: "Lost", value: "lost" },
  { label: "Found", value: "found" },
  { label: "Resolved", value: "resolved" },
];

function buildItemsUrl(type: LostItemFilter, search?: string) {
  const normalizedSearch = search?.trim() ?? "";
  const params = new URLSearchParams();

  if (type === "lost" || type === "found") {
    params.set("type", type);
  }

  if (type === "resolved") {
    params.set("status", "resolved");
  } else {
    params.set("status", "active");
  }

  if (normalizedSearch) {
    params.set("search", normalizedSearch);
  }

  const query = params.toString();
  return query ? `/api/lost?${query}` : "/api/lost";
}

async function fetchFilteredItems(options?: {
  search?: string;
  type?: LostItemFilter;
  signal?: AbortSignal;
}) {
  const type = options?.type ?? "all";
  const url = buildItemsUrl(type, options?.search);
  const response = await fetch(url, {
    signal: options?.signal,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to fetch filtered items.");
  }

  const data = (await response.json()) as LostItem[];
  return data;
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function HomePage({ items }: HomePageProps) {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const currentUser = session?.user ?? null;
  const navbarAvatarLetter = (currentUser?.name || currentUser?.email || "U")
    .trim()
    .charAt(0)
    .toUpperCase();
  const navbarAvatarImage = currentUser?.image ?? "";
  const [query, setQuery] = useState("");
  const [activeType, setActiveType] = useState<LostItemFilter>("all");
  const [filteredItems, setFilteredItems] = useState(items);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [claimingItem, setClaimingItem] = useState<LostItem | null>(null);
  const [claimMessage, setClaimMessage] = useState("");
  const [claimError, setClaimError] = useState("");
  const [actionError, setActionError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const initialItemsRef = useRef(items);

  useEffect(() => {
    initialItemsRef.current = items;
    setFilteredItems(items);
  }, [items]);

  useEffect(() => {
    const controller = new AbortController();
    const search = query.trim();
    const hasTypeFilter = activeType !== "all";

    if (!search && !hasTypeFilter) {
      setIsLoading(false);
      setFilteredItems(initialItemsRef.current);
      return () => controller.abort();
    }

    const fetchItems = async () => {
      try {
        setIsLoading(true);
        const nextItems = await fetchFilteredItems({
          search,
          type: activeType,
          signal: controller.signal,
        });
        setFilteredItems(nextItems);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setFilteredItems([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void fetchItems();

    return () => controller.abort();
  }, [activeType, query]);

  const stats = [
    { label: "Items found", value: `${items.length}+`, glow: "stats-glow-blue" },
    { label: "Students helped", value: "320+", glow: "stats-glow-emerald" },
    { label: "Campus locations", value: "18", glow: "stats-glow-purple" },
  ];

  async function handleMarkAsFound(itemId: string) {
    if (!currentUser?.email) {
      return;
    }

    setPendingItemId(itemId);
    setActionError("");

    try {
      const response = await fetch(`/api/lost/${itemId}`, {
        method: "PATCH",
      });

      if (!response.ok) {
        throw new Error("Unable to update the item.");
      }

      const data = (await response.json()) as { item?: LostItem };

      if (!data.item) {
        throw new Error("Updated item was not returned.");
      }

      initialItemsRef.current = initialItemsRef.current.map((item) =>
        item.id === data.item?.id ? data.item : item,
      );

      const nextItems = await fetchFilteredItems({
        search: query,
        type: activeType,
      });

      setFilteredItems(nextItems);
    } catch (error) {
      setActionError((error as Error).message || "Unable to update the item right now.");
    } finally {
      setPendingItemId(null);
    }
  }

  function handleTypeFilterChange(nextType: LostItemFilter) {
    setActiveType(nextType);
  }

  async function handleClaimSubmit() {
    if (!claimingItem) {
      return;
    }

    setClaimError("");
    setIsSubmittingClaim(true);

    try {
      const response = await fetch("/api/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemId: claimingItem.id,
          message: claimMessage,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; claim?: Claim }
        | null;

      if (!response.ok || !payload?.claim) {
        throw new Error(payload?.error ?? "Unable to submit claim.");
      }

      setClaimingItem(null);
      setClaimMessage("");
    } catch (error) {
      setClaimError((error as Error).message || "Unable to submit claim right now.");
    } finally {
      setIsSubmittingClaim(false);
    }
  }

  function handleProtectedNavigation(path: string) {
    if (sessionStatus !== "authenticated") {
      setAuthNotice("Please login first to continue.");
      return;
    }

    setAuthNotice("");
    router.push(path);
  }

  function handleMobileProtectedNavigation(path: string) {
    setIsMobileMenuOpen(false);
    handleProtectedNavigation(path);
  }

  return (
    <div className="app-background relative min-h-screen before:absolute before:inset-0 before:content-['']">
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-16 pt-6">
        <header className="navbar-glass sticky top-4 z-50 mx-auto w-full max-w-7xl rounded-2xl">
          <span aria-hidden="true" className="navbar-glass-backdrop" />
          <div className="relative z-10 flex items-center justify-between gap-3 px-3 py-3 sm:hidden">
            <Link
              href="/"
              className="flex min-w-0 shrink items-center gap-2 text-[var(--text)]"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--text)] text-sm font-semibold text-[var(--background)] shadow-lg shadow-[var(--shadow)]">
                LF
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-[0.24em] eyebrow">
                  Campus Support
                </p>
                <h1 className="truncate text-base font-semibold text-[var(--text)]">
                  Lost &amp; Found Portal
                </h1>
              </div>
            </Link>

            <div className="flex shrink-0 items-center gap-2">
              {sessionStatus === "authenticated" ? (
                <span
                  className="navbar-user-avatar relative inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full text-base font-bold text-white"
                  title={currentUser?.name || currentUser?.email || "User"}
                  aria-label={currentUser?.name || currentUser?.email || "User profile"}
                >
                  {navbarAvatarImage ? (
                    <Image
                      src={navbarAvatarImage}
                      alt=""
                      fill
                      sizes="44px"
                      className="object-cover"
                    />
                  ) : (
                    navbarAvatarLetter
                  )}
                </span>
              ) : null}
              <div className="h-11 w-11">
                <ThemeToggle />
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen((isOpen) => !isOpen)}
                className="mobile-menu-trigger glass inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/25 bg-white/10 text-[var(--text)] shadow-[0_8px_24px_-18px_rgba(59,130,246,0.65)]"
                aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={isMobileMenuOpen}
              >
                <span className="relative h-4 w-5" aria-hidden="true">
                  <span
                    className={`mobile-menu-trigger-line absolute left-0 top-0 h-0.5 w-5 rounded-full bg-current ${
                      isMobileMenuOpen ? "translate-y-[7px] rotate-45" : ""
                    }`}
                  />
                  <span
                    className={`mobile-menu-trigger-line absolute left-0 top-[7px] h-0.5 w-5 rounded-full bg-current ${
                      isMobileMenuOpen ? "scale-x-0 opacity-0" : ""
                    }`}
                  />
                  <span
                    className={`mobile-menu-trigger-line absolute left-0 top-[14px] h-0.5 w-5 rounded-full bg-current ${
                      isMobileMenuOpen ? "-translate-y-[7px] -rotate-45" : ""
                    }`}
                  />
                </span>
              </button>
            </div>
          </div>

          <div
            className={`mobile-menu-panel absolute right-3 top-full z-[80] mt-3 w-[min(calc(100vw-2rem),20rem)] origin-top-right rounded-[1.75rem] border border-[var(--navbar-border)] p-3.5 shadow-[0_34px_90px_-42px_var(--navbar-shadow),0_22px_52px_-34px_var(--shadow),inset_0_1px_0_rgba(255,255,255,0.36)] backdrop-blur-2xl transition-all duration-200 ease-out sm:hidden ${
              isMobileMenuOpen
                ? "translate-y-0 scale-100 opacity-100"
                : "pointer-events-none -translate-y-2 scale-[0.98] opacity-0"
            }`}
          >
            <nav className="relative z-10 grid gap-2.5">
              {sessionStatus === "authenticated" ? (
                <Link
                  href="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="mobile-menu-item glass flex min-h-12 items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-medium text-[var(--text)] shadow-[0_8px_24px_-18px_rgba(59,130,246,0.65)] hover:text-[var(--text)]"
                >
                  Profile
                </Link>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="mobile-menu-item glass flex min-h-12 items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-medium text-[var(--text)] shadow-[0_8px_24px_-18px_rgba(59,130,246,0.65)] hover:text-[var(--text)]"
                >
                  Login
                </Link>
              )}
              <a
                href="#recent-items"
                onClick={() => setIsMobileMenuOpen(false)}
                className="mobile-menu-item glass flex min-h-12 items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-medium text-[var(--text)] shadow-[0_8px_24px_-18px_rgba(59,130,246,0.65)] hover:text-[var(--text)]"
              >
                Browse Items
              </a>
              <button
                type="button"
                onClick={() => handleMobileProtectedNavigation("/report-found")}
                className="mobile-menu-item mobile-menu-item-accent navbar-action-button btn-success group relative isolate flex min-h-12 items-center justify-center overflow-hidden rounded-2xl border border-cyan-300/25 bg-white/10 px-4 py-3 text-sm font-medium shadow-[0_8px_24px_-18px_rgba(34,211,238,0.75)] hover:border-cyan-200/55 hover:shadow-[0_0_0_1px_rgba(34,211,238,0.2),0_14px_34px_-16px_rgba(34,211,238,0.98),0_0_34px_-14px_rgba(79,70,229,0.86)]"
              >
                Report Found
              </button>
              <button
                type="button"
                onClick={() => handleMobileProtectedNavigation("/report-lost")}
                className="mobile-menu-item mobile-menu-item-accent navbar-action-button btn-primary group relative isolate flex min-h-12 items-center justify-center overflow-hidden rounded-2xl border border-pink-300/25 bg-white/10 px-4 py-3 text-sm font-medium shadow-[0_8px_24px_-18px_rgba(244,63,94,0.75)] hover:border-pink-200/55 hover:shadow-[0_0_0_1px_rgba(96,165,250,0.2),0_14px_34px_-16px_rgba(244,63,94,0.96),0_0_34px_-14px_rgba(79,70,229,0.86)]"
              >
                Report Lost
              </button>
            </nav>
          </div>

          <div className="relative z-10 hidden flex-col items-center justify-between gap-3 px-3 py-3 sm:flex sm:flex-row sm:flex-wrap sm:gap-x-3 sm:gap-y-3 sm:px-5 lg:flex-nowrap">
            <Link href="/" className="flex min-w-0 shrink items-center justify-center gap-2 text-[var(--text)] sm:justify-start sm:gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--text)] text-sm font-semibold text-[var(--background)] shadow-lg shadow-[var(--shadow)]">
                LF
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium uppercase tracking-[0.28em] eyebrow">
                  Campus Support
                </p>
                <h1 className="truncate text-lg font-semibold text-[var(--text)]">
                  Lost &amp; Found Portal
                </h1>
              </div>
            </Link>

            <nav className="grid w-full min-w-0 grid-cols-6 items-center gap-2 sm:ml-auto sm:flex sm:w-auto sm:flex-nowrap sm:justify-end lg:gap-3">
              {sessionStatus === "authenticated" ? (
                <div className="col-span-3 flex min-w-0 flex-nowrap items-center gap-2 sm:shrink-0 lg:gap-3">
                  <span
                    className="navbar-user-avatar relative inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full text-base font-bold text-white"
                    title={currentUser?.name || currentUser?.email || "User"}
                    aria-label={currentUser?.name || currentUser?.email || "User profile"}
                  >
                    {navbarAvatarImage ? (
                      <Image
                        src={navbarAvatarImage}
                        alt=""
                        fill
                        sizes="44px"
                        className="object-cover"
                      />
                    ) : (
                      navbarAvatarLetter
                    )}
                  </span>
                  <Link
                    href="/profile"
                    className="glass flex min-h-11 min-w-0 flex-1 shrink-0 items-center justify-center whitespace-nowrap rounded-2xl border border-white/25 bg-white/10 px-3 py-2 text-sm font-medium text-[var(--text)] shadow-[0_8px_24px_-18px_rgba(59,130,246,0.65)] hover:text-[var(--text)] sm:min-h-0 sm:flex-none lg:px-4"
                  >
                    Profile
                  </Link>
                </div>
              ) : (
                <div className="col-span-3 flex min-w-0 flex-nowrap items-center gap-2 sm:shrink-0 lg:gap-3">
                  <Link
                    href="/login"
                    className="glass flex min-h-11 min-w-0 flex-1 shrink-0 items-center justify-center whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-[var(--text)] hover:text-[var(--text)] sm:min-h-0 sm:flex-none sm:py-1"
                  >
                    Login
                  </Link>
                </div>
              )}
              <a
                href="#recent-items"
                className="glass col-span-3 flex min-h-11 min-w-0 shrink-0 items-center justify-center whitespace-nowrap rounded-2xl border border-white/25 bg-white/10 px-3 py-2 text-sm font-medium text-[var(--text)] shadow-[0_8px_24px_-18px_rgba(59,130,246,0.65)] hover:text-[var(--text)] sm:min-h-0 lg:px-4"
              >
                Browse Items
              </a>
              <button
                type="button"
                onClick={() => handleProtectedNavigation("/report-found")}
                className="navbar-action-button btn-success group relative isolate col-span-2 flex min-h-11 min-w-0 shrink-0 items-center justify-center overflow-hidden whitespace-nowrap rounded-2xl border border-cyan-300/25 bg-white/10 px-2 py-2 text-xs font-medium shadow-[0_8px_24px_-18px_rgba(34,211,238,0.75)] before:absolute before:inset-0 before:-z-10 before:bg-gradient-to-r before:from-cyan-300/0 before:via-blue-400/0 before:to-indigo-400/0 before:opacity-0 hover:border-cyan-200/55 hover:shadow-[0_0_0_1px_rgba(34,211,238,0.2),0_14px_34px_-16px_rgba(34,211,238,0.98),0_0_34px_-14px_rgba(79,70,229,0.86)] hover:before:bg-gradient-to-r hover:before:from-cyan-300/22 hover:before:via-blue-400/20 hover:before:to-indigo-400/18 hover:before:opacity-100 sm:min-h-0 sm:px-3 sm:text-sm lg:px-4"
              >
                <span className="relative z-10 block">
                  Report Found
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleProtectedNavigation("/report-lost")}
                className="navbar-action-button btn-primary group relative isolate col-span-2 flex min-h-11 min-w-0 shrink-0 items-center justify-center overflow-hidden whitespace-nowrap rounded-2xl border border-pink-300/25 bg-white/10 px-2 py-2 text-xs font-medium shadow-[0_8px_24px_-18px_rgba(244,63,94,0.75)] before:absolute before:inset-0 before:-z-10 before:bg-gradient-to-r before:from-pink-300/0 before:via-blue-400/0 before:to-indigo-400/0 before:opacity-0 hover:border-pink-200/55 hover:shadow-[0_0_0_1px_rgba(96,165,250,0.2),0_14px_34px_-16px_rgba(244,63,94,0.96),0_0_34px_-14px_rgba(79,70,229,0.86)] hover:before:bg-gradient-to-r hover:before:from-pink-300/20 hover:before:via-blue-400/18 hover:before:to-indigo-400/18 hover:before:opacity-100 sm:min-h-0 sm:px-3 sm:text-sm lg:px-4"
              >
                <span className="relative z-10 block">
                  Report Lost
                </span>
              </button>
              <div className="col-span-2 min-w-0 sm:contents">
                <ThemeToggle />
              </div>
            </nav>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-10 pt-10">
          <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div className="glass-card rounded-[2rem] p-8 shadow-sm transition-all duration-300 hover:shadow-md sm:p-10">
              <p className="mb-4 inline-flex glass rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.32em] eyebrow">
                Trusted across campus
              </p>
              <h2 className="max-w-2xl text-4xl font-semibold leading-tight text-[var(--text)] sm:text-6xl">
                Reconnect people with the things that matter most.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--text-secondary)] sm:text-lg">
                A fast, student-friendly portal to report missing belongings, search recent
                activity, and help lost items find their way home.
              </p>

              <div className="glass-card mx-auto mt-8 max-w-3xl rounded-2xl p-6 text-[var(--text)] shadow-sm transition-all duration-300 hover:shadow-md">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold text-[var(--text)]">
                      Search and manage items
                    </h3>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      Browse active reports, refine results, or submit a new item in seconds.
                    </p>
                  </div>

                  <div className="relative w-full">
                    <label htmlFor="item-search" className="sr-only">
                      Search recent items
                    </label>
                    <input
                      id="item-search"
                      type="text"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Search items, description, location..."
                      className="glass-input w-full rounded-xl px-4 py-2 pl-10 text-sm text-[var(--text)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                    <span className="absolute left-3 top-3 text-[var(--text-muted)] ">
                      <SearchIcon />
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {typeFilters.map((filter) => {
                      const isActive = activeType === filter.value;

                      return (
                        <button
                          key={filter.value}
                          type="button"
                          onClick={() => void handleTypeFilterChange(filter.value)}
                          className={`filter-tab cursor-pointer rounded-full border px-4 py-1.5 text-sm font-medium transition duration-200 ease-in-out ${isActive
                            ? "border-transparent bg-[var(--accent)] text-[var(--on-accent)] shadow-md"
                            : "glass border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface)] hover:text-[var(--text)]"
                            }`}
                        >
                          {filter.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => handleProtectedNavigation("/report-lost")}
                      className="quick-action-btn btn-primary rounded-xl px-4 py-2 font-medium active:scale-95"
                    >
                      + Report Lost
                    </button>
                    <button
                      type="button"
                      onClick={() => handleProtectedNavigation("/report-found")}
                      className="quick-action-btn btn-success rounded-xl px-4 py-2 font-medium active:scale-95"
                    >
                      + Report Found
                    </button>
                  </div>

                  {authNotice ? (
                    <div className="rounded-[1.25rem] alert-error px-4 py-3 text-sm">
                      {authNotice}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className={`stats-glow-card ${stat.glow} glass-card rounded-[1.75rem] p-6 shadow-sm transition-all duration-200 ease-out hover:shadow-md dark:hover:shadow-xl`}
                >
                  <p className="text-sm uppercase tracking-[0.25em] text-[var(--text-secondary)]">
                    {stat.label}
                  </p>
                  <p className="mt-3 text-4xl font-semibold text-[var(--text)]">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section
            id="recent-items"
            className="glass-card scroll-mt-28 rounded-[2rem] p-8 shadow-sm sm:p-10"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] eyebrow">
                  Recent activity
                </p>
                <h3 className="mt-2 text-3xl font-semibold text-[var(--text)]">
                  Submitted items appear here instantly
                </h3>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">
                Showing {filteredItems.length} of {items.length} reports
                {isLoading ? " | Updating..." : ""}
              </p>
            </div>

            {actionError ? (
              <div className="mt-6 rounded-[1.25rem] alert-error px-4 py-3 text-sm">
                {actionError}
              </div>
            ) : null}

            <div className="mt-8 grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  showContactNumber={Boolean(currentUser)}
                  canResolve={Boolean(currentUser) && isItemOwner(item.userEmail, currentUser?.email)}
                  canClaim={Boolean(currentUser) && !isItemOwner(item.userEmail, currentUser?.email)}
                  isBusy={pendingItemId === item.id}
                  useRecentActionStyle
                  onResolve={handleMarkAsFound}
                  onClaim={(nextItem) => {
                    setClaimError("");
                    setClaimMessage("");
                    setClaimingItem(nextItem);
                  }}
                />
              ))}
            </div>

            {!filteredItems.length ? (
              <div className="glass-card mt-8 rounded-[1.5rem] border border-dashed border-[var(--border)] px-6 py-10 text-center text-[var(--text-secondary)]">
                No matching items yet. Try a different keyword or submit a new report.
              </div>
            ) : null}
          </section>
        </main>
      </div>

      {claimingItem ? (
        <div className="claim-modal-backdrop fixed inset-0 z-40 flex items-center justify-center px-5">
          <div className="claim-modal-panel w-full max-w-xl rounded-[2rem] p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] eyebrow">
                  Claim Request
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-[var(--text)]">
                  Claim {claimingItem.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setClaimingItem(null);
                  setClaimMessage("");
                  setClaimError("");
                }}
                className="claim-modal-danger-hover glass inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--text-secondary)] transition-all duration-150 ease-out"
              >
                X
              </button>
            </div>

            <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
              Tell the finder why this item belongs to you. Share details like brand, markings, or
              what was inside.
            </p>

            <label
              htmlFor="claim-message"
              className="mt-6 block text-sm font-semibold text-[var(--text)]"
            >
              Why this is your item?
            </label>
            <textarea
              id="claim-message"
              rows={6}
              value={claimMessage}
              onChange={(event) => setClaimMessage(event.target.value)}
              placeholder="Example: The bag has my student ID in the front pocket and a blue charger inside."
              className="glass-input mt-2 w-full rounded-[1.35rem] px-4 py-4 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-secondary)] focus:ring-2 focus:ring-[var(--primary)]"
            />

            {claimError ? (
              <div className="mt-4 rounded-[1.25rem] alert-error px-4 py-3 text-sm">
                {claimError}
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setClaimingItem(null);
                  setClaimMessage("");
                  setClaimError("");
                }}
                className="claim-modal-danger-hover glass rounded-xl px-4 py-2 text-sm font-medium text-[var(--text)] transition-all duration-150 ease-out"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleClaimSubmit()}
                disabled={isSubmittingClaim}
                className="claim-send-request-btn recent-action-btn btn-accent rounded-xl px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmittingClaim ? "Submitting..." : "Send Claim Request"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
