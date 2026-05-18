"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { Claim } from "@/lib/claim-shared";
import type { LostItem, LostItemFilter } from "@/lib/lost-item-shared";
import type { LostFoundStats } from "@/lib/lost-items";
import { isItemOwner } from "@/lib/lost-item-shared";
import { ItemCard } from "./item-card";
import ThemeToggle from "./theme-toggle";

type HomePageProps = {
  items: LostItem[];
  stats: LostFoundStats;
};

type ItemResponseMode = "claim" | "found";

type SuccessConfirmation = {
  mode: ItemResponseMode;
  itemTitle: string;
  sentAt: string;
};

const typeFilters: Array<{ label: string; value: LostItemFilter }> = [
  { label: "All", value: "all" },
  { label: "Lost", value: "lost" },
  { label: "Found", value: "found" },
  { label: "Resolved", value: "resolved" },
];

function getMobileFilterToneClass(type: LostItemFilter) {
  if (type === "lost") {
    return "filter-mobile-tone-lost";
  }

  if (type === "found") {
    return "filter-mobile-tone-found";
  }

  if (type === "resolved") {
    return "filter-mobile-tone-resolved";
  }

  return "filter-mobile-tone-all";
}

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

function formatConfirmationTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
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

export function HomePage({ items, stats: homeStats }: HomePageProps) {
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
  const [totalReportsCount, setTotalReportsCount] = useState(items.length);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [responseItem, setResponseItem] = useState<LostItem | null>(null);
  const [responseMode, setResponseMode] = useState<ItemResponseMode>("claim");
  const [responseMessage, setResponseMessage] = useState("");
  const [responseError, setResponseError] = useState("");
  const [successConfirmation, setSuccessConfirmation] = useState<SuccessConfirmation | null>(null);
  const [actionError, setActionError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const initialItemsRef = useRef(items);
  const filterDropdownRef = useRef<HTMLDivElement | null>(null);
  const activeTypeLabel =
    typeFilters.find((filter) => filter.value === activeType)?.label ?? "All";

  useEffect(() => {
    initialItemsRef.current = items;
    setFilteredItems(items);
    setTotalReportsCount(items.length);
  }, [items]);

  const refreshVisibleItems = useCallback(
    async (options?: { signal?: AbortSignal; silent?: boolean }) => {
      const search = query.trim();
      try {
        if (!options?.silent) {
          setIsLoading(true);
        }
        const nextItems = await fetchFilteredItems({
          search,
          type: activeType,
          signal: options?.signal,
        });

        if (!search && activeType === "all") {
          initialItemsRef.current = nextItems;
          setTotalReportsCount(nextItems.length);
        }

        setFilteredItems(nextItems);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          if (!options?.silent) {
            setFilteredItems([]);
          }
        }
      } finally {
        if (!options?.signal?.aborted && !options?.silent) {
          setIsLoading(false);
        }
      }
    },
    [activeType, query],
  );

  useEffect(() => {
    const controller = new AbortController();

    void refreshVisibleItems({ signal: controller.signal });

    return () => controller.abort();
  }, [refreshVisibleItems]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void refreshVisibleItems({ silent: true });
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [refreshVisibleItems]);

  useEffect(() => {
    if (!isFilterDropdownOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!filterDropdownRef.current?.contains(event.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsFilterDropdownOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFilterDropdownOpen]);

  useEffect(() => {
    if (!successConfirmation) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSuccessConfirmation(null);
    }, 3600);

    return () => window.clearTimeout(timeoutId);
  }, [successConfirmation]);

  const stats = [
    { label: "Items found", value: `${homeStats.resolvedItemsCount}+`, glow: "stats-glow-blue" },
    { label: "Students helped", value: `${homeStats.studentsHelpedCount}+`, glow: "stats-glow-emerald" },
    { label: "Campus locations", value: `${homeStats.campusLocationsCount}+`, glow: "stats-glow-purple" },
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

      await refreshVisibleItems({ silent: true });
    } catch (error) {
      setActionError((error as Error).message || "Unable to update the item right now.");
    } finally {
      setPendingItemId(null);
    }
  }

  function handleTypeFilterChange(nextType: LostItemFilter) {
    setActiveType(nextType);
    setIsFilterDropdownOpen(false);
  }

  function openItemResponse(item: LostItem, mode: ItemResponseMode) {
    setResponseError("");
    setResponseMessage("");
    setSuccessConfirmation(null);
    setResponseItem(item);
    setResponseMode(mode);
  }

  function closeItemResponse() {
    setResponseItem(null);
    setResponseMessage("");
    setResponseError("");
  }

  async function handleItemResponseSubmit() {
    if (!responseItem || isSubmittingResponse) {
      return;
    }

    const submittedMode = responseMode;
    const submittedItemTitle = responseItem.title;

    setResponseError("");
    setIsSubmittingResponse(true);

    try {
      const response = await fetch("/api/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemId: responseItem.id,
          message: responseMessage,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; claim?: Claim }
        | null;

      if (!response.ok || !payload?.claim) {
        throw new Error(
          payload?.error ??
            (responseMode === "found"
              ? "Unable to submit found details."
              : "Unable to submit claim."),
        );
      }

      closeItemResponse();
      setSuccessConfirmation({
        mode: submittedMode,
        itemTitle: submittedItemTitle,
        sentAt: payload.claim.createdAt,
      });
    } catch (error) {
      setResponseError(
        (error as Error).message ||
          (responseMode === "found"
            ? "Unable to submit found details right now."
            : "Unable to submit claim right now."),
      );
    } finally {
      setIsSubmittingResponse(false);
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
                <p className="text-xs font-medium uppercase tracking-[0.24em] eyebrow max-[360px]:hidden">
                  Campus Support
                </p>
                <h1 className="truncate text-base font-semibold leading-tight text-[var(--text)] max-[360px]:text-sm">
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
            className={`mobile-menu-panel absolute right-3 top-full z-[80] mt-3 w-[min(calc(100vw-1.5rem),20rem)] origin-top-right rounded-[1.75rem] border border-[var(--navbar-border)] p-3 shadow-[0_34px_90px_-42px_var(--navbar-shadow),0_22px_52px_-34px_var(--shadow),inset_0_1px_0_rgba(255,255,255,0.36)] transition-all duration-200 ease-out min-[360px]:p-3.5 sm:hidden ${
              isMobileMenuOpen
                ? "mobile-menu-panel-open opacity-100"
                : "mobile-menu-panel-closed pointer-events-none -translate-y-2 opacity-0"
            }`}
          >
            <nav className="relative z-10 grid gap-2.5">
              {sessionStatus === "authenticated" ? (
                <Link
                  href="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="mobile-menu-item glass flex min-h-12 items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-medium text-[var(--text)] shadow-[0_8px_24px_-18px_rgba(59,130,246,0.65)] hover:text-[var(--text)]"
                >
                  <span className="relative z-10">Profile</span>
                </Link>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="mobile-menu-item glass flex min-h-12 items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-medium text-[var(--text)] shadow-[0_8px_24px_-18px_rgba(59,130,246,0.65)] hover:text-[var(--text)]"
                >
                  <span className="relative z-10">Login</span>
                </Link>
              )}
              <a
                href="#recent-items"
                onClick={() => setIsMobileMenuOpen(false)}
                className="mobile-menu-item glass flex min-h-12 items-center justify-center rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-medium text-[var(--text)] shadow-[0_8px_24px_-18px_rgba(59,130,246,0.65)] hover:text-[var(--text)]"
              >
                <span className="relative z-10">Browse Items</span>
              </a>
              <button
                type="button"
                onClick={() => handleMobileProtectedNavigation("/report-found")}
                className="mobile-menu-item mobile-menu-item-accent navbar-action-button btn-success group relative isolate flex min-h-12 items-center justify-center overflow-hidden rounded-2xl border border-cyan-300/25 bg-white/10 px-4 py-3 text-sm font-medium shadow-[0_8px_24px_-18px_rgba(34,211,238,0.75)] hover:border-cyan-200/55 hover:shadow-[0_0_0_1px_rgba(34,211,238,0.2),0_14px_34px_-16px_rgba(34,211,238,0.98),0_0_34px_-14px_rgba(79,70,229,0.86)]"
              >
                <span className="relative z-10">Report Found</span>
              </button>
              <button
                type="button"
                onClick={() => handleMobileProtectedNavigation("/report-lost")}
                className="mobile-menu-item mobile-menu-item-accent navbar-action-button btn-primary group relative isolate flex min-h-12 items-center justify-center overflow-hidden rounded-2xl border border-pink-300/25 bg-white/10 px-4 py-3 text-sm font-medium shadow-[0_8px_24px_-18px_rgba(244,63,94,0.75)] hover:border-pink-200/55 hover:shadow-[0_0_0_1px_rgba(96,165,250,0.2),0_14px_34px_-16px_rgba(244,63,94,0.96),0_0_34px_-14px_rgba(79,70,229,0.86)]"
              >
                <span className="relative z-10">Report Lost</span>
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

              <div
                className={`glass-card relative mx-auto mt-8 max-w-3xl overflow-visible rounded-2xl p-6 text-[var(--text)] shadow-sm transition-all duration-300 hover:shadow-md ${
                  isFilterDropdownOpen ? "z-50" : "z-10"
                }`}
              >
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

                  <div ref={filterDropdownRef} className="relative mt-3 sm:hidden">
                    <button
                      type="button"
                      onClick={() => setIsFilterDropdownOpen((current) => !current)}
                      className={`filter-mobile-trigger ${getMobileFilterToneClass(
                        activeType,
                      )} glass flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border border-[var(--border)] px-4 py-3 text-left text-sm font-semibold text-[var(--text)] shadow-[0_16px_42px_-30px_var(--shadow-elevated)] transition-all duration-200 ease-out`}
                      aria-expanded={isFilterDropdownOpen}
                      aria-haspopup="listbox"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="filter-mobile-dot h-2.5 w-2.5 shrink-0 rounded-full" />
                        <span className="min-w-0 truncate">{activeTypeLabel}</span>
                      </span>
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rotate-45 border-b-2 border-r-2 border-current transition-transform duration-200 ease-out ${
                          isFilterDropdownOpen ? "rotate-[225deg]" : ""
                        }`}
                        aria-hidden="true"
                      />
                    </button>

                    <div
                      className={`filter-mobile-menu absolute left-0 right-0 top-[calc(100%+0.6rem)] z-30 overflow-hidden rounded-2xl border border-[var(--border)] p-2 shadow-[0_24px_70px_-34px_var(--shadow-elevated)] transition-opacity duration-150 ease-out ${
                        isFilterDropdownOpen
                          ? "pointer-events-auto opacity-100"
                          : "pointer-events-none opacity-0"
                      }`}
                      role="listbox"
                    >
                      {typeFilters.map((filter) => {
                        const isActive = activeType === filter.value;

                        return (
                          <button
                            key={filter.value}
                            type="button"
                            onClick={() => void handleTypeFilterChange(filter.value)}
                            className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-semibold transition-all duration-150 ease-out ${getMobileFilterToneClass(
                              filter.value,
                            )} ${
                              isActive
                                ? "filter-mobile-option-active"
                                : "text-[var(--text)] hover:bg-[var(--surface)]"
                            }`}
                            role="option"
                            aria-selected={isActive}
                          >
                            <span>{filter.label}</span>
                            {isActive ? (
                              <span className="filter-mobile-selected-dot h-2 w-2 rounded-full" aria-hidden="true" />
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-3 hidden flex-wrap gap-2 sm:flex">
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
                Showing {filteredItems.length} of {totalReportsCount} reports
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
                  canClaim={
                    Boolean(currentUser) &&
                    item.type === "found" &&
                    !isItemOwner(item.userEmail, currentUser?.email)
                  }
                  canReportFound={
                    Boolean(currentUser) &&
                    item.type === "lost" &&
                    !isItemOwner(item.userEmail, currentUser?.email)
                  }
                  isBusy={pendingItemId === item.id}
                  useRecentActionStyle
                  onResolve={handleMarkAsFound}
                  onClaim={(nextItem) => openItemResponse(nextItem, "claim")}
                  onReportFound={(nextItem) => openItemResponse(nextItem, "found")}
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

      {responseItem ? (
        <div className="claim-modal-backdrop fixed inset-0 z-40 flex items-center justify-center px-5">
          <div className="claim-modal-panel w-full max-w-xl rounded-[2rem] p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] eyebrow">
                  {responseMode === "found" ? "Finder Response" : "Claim Request"}
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-[var(--text)]">
                  {responseMode === "found" ? "I Found " : "Claim "}
                  {responseItem.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeItemResponse}
                className="claim-modal-danger-hover glass inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--text-secondary)] transition-all duration-150 ease-out"
              >
                X
              </button>
            </div>

            <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
              {responseMode === "found"
                ? "Share where you found it, when you found it, and any safe handoff details. The owner can review your response before opening a private chat."
                : "Tell the finder why this item belongs to you. Share details like brand, markings, or what was inside."}
            </p>

            <label
              htmlFor="item-response-message"
              className="mt-6 block text-sm font-semibold text-[var(--text)]"
            >
              {responseMode === "found" ? "Found item details" : "Why this is your item?"}
            </label>
            <textarea
              id="item-response-message"
              rows={6}
              value={responseMessage}
              onChange={(event) => setResponseMessage(event.target.value)}
              placeholder={
                responseMode === "found"
                  ? "Example: I found it near the library entrance around 4 PM. The item has a small scratch near the zip."
                  : "Example: The bag has my student ID in the front pocket and a blue charger inside."
              }
              className="glass-input mt-2 w-full rounded-[1.35rem] px-4 py-4 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-secondary)] focus:ring-2 focus:ring-[var(--primary)]"
            />

            {responseError ? (
              <div className="mt-4 rounded-[1.25rem] alert-error px-4 py-3 text-sm">
                {responseError}
              </div>
            ) : null}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeItemResponse}
                className="claim-modal-danger-hover glass rounded-xl px-4 py-2 text-sm font-medium text-[var(--text)] transition-all duration-150 ease-out"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleItemResponseSubmit()}
                disabled={isSubmittingResponse}
                className={`claim-send-request-btn recent-action-btn ${
                  responseMode === "found" ? "btn-success" : "btn-accent"
                } rounded-xl px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-70`}
              >
                {isSubmittingResponse
                  ? "Submitting..."
                  : responseMode === "found"
                    ? "Send Found Details"
                    : "Send Claim Request"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {successConfirmation ? (
        <div
          className="success-confirmation-backdrop fixed inset-0 z-40 flex items-center justify-center px-5"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="success-confirmation-card w-full max-w-md rounded-[2rem] p-7 text-center sm:p-8">
            <div className="success-orbit mx-auto flex h-24 w-24 items-center justify-center rounded-full">
              <div className="success-check-wrap flex h-16 w-16 items-center justify-center rounded-full">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 52 52"
                  className="success-check-icon h-12 w-12"
                >
                  <circle className="success-check-circle" cx="26" cy="26" r="23" />
                  <path className="success-check-path" d="M15 27.5 22.5 35 38 18.5" />
                </svg>
              </div>
            </div>

            <p className="mt-5 text-sm font-semibold uppercase tracking-[0.28em] eyebrow">
              Request submitted
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-[var(--text)]">
              {successConfirmation.mode === "found"
                ? "Found Details Sent Successfully"
                : "Claim Request Sent Successfully"}
            </h3>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
              {successConfirmation.mode === "found"
                ? "You can track updates in Finder Responses."
                : "You can track updates in Ownership Claims."}
            </p>
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--success)]">
              Sent {formatConfirmationTime(successConfirmation.sentAt)}
            </p>
            <p className="mt-4 truncate rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)]">
              {successConfirmation.itemTitle}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
