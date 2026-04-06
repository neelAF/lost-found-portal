"use client";

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
  const [query, setQuery] = useState("");
  const [activeType, setActiveType] = useState<LostItemFilter>("all");
  const [filteredItems, setFilteredItems] = useState(items);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [claimingItem, setClaimingItem] = useState<LostItem | null>(null);
  const [claimMessage, setClaimMessage] = useState("");
  const [claimError, setClaimError] = useState("");
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);
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
    { label: "Items found", value: `${items.length}+` },
    { label: "Students helped", value: "320+" },
    { label: "Campus locations", value: "18" },
  ];

  async function handleMarkAsFound(itemId: string) {
    if (!currentUser?.email) {
      return;
    }

    setPendingItemId(itemId);

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
      console.error(error);
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
      window.alert("Please login first");
      return;
    }

    router.push(path);
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_60%)] before:content-[''] dark:bg-none dark:before:hidden">
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-16 pt-6">
        <header className="sticky top-4 z-50 mx-auto w-full max-w-7xl rounded-2xl border border-white/20 bg-white/60 shadow-sm backdrop-blur-xl dark:border-slate-700 dark:bg-white/10 dark:shadow-lg">
          <div className="flex items-center justify-between gap-4 px-5 py-3">
            <Link href="/" className="flex items-center gap-3 text-slate-800 dark:text-white">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 dark:bg-white dark:text-slate-950">
                LF
              </div>
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.28em] text-indigo-600 dark:text-indigo-300">
                  Campus Support
                </p>
                <h1 className="text-lg font-semibold text-slate-800 dark:text-white">
                  Lost &amp; Found Portal
                </h1>
              </div>
            </Link>

            <nav className="flex flex-wrap items-center justify-end gap-3">
              {sessionStatus === "authenticated" ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex min-h-11 items-center rounded-lg bg-white/60 px-3 py-1 text-sm font-medium text-slate-800 dark:bg-white/10 dark:text-white">
                    {currentUser?.name || currentUser?.email}
                  </span>
                  <Link
                    href="/profile"
                    className="rounded-lg bg-white/60 px-3 py-1 text-sm font-medium text-slate-700 transition-colors duration-200 hover:text-slate-900 dark:bg-white/10 dark:text-slate-300 dark:hover:text-white"
                  >
                    Profile
                  </Link>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href="/login"
                    className="rounded-lg bg-white/60 px-3 py-1 text-sm font-medium text-slate-700 transition-colors duration-200 hover:text-slate-900 dark:bg-white/10 dark:text-slate-300 dark:hover:text-white"
                  >
                    Login
                  </Link>
                </div>
              )}
              <a
                href="#recent-items"
                className="rounded-lg bg-white/60 px-3 py-1 text-sm font-medium text-slate-700 transition-colors duration-200 hover:text-slate-900 dark:bg-white/10 dark:text-slate-300 dark:hover:text-white"
              >
                Browse Items
              </a>
              <button
                type="button"
                onClick={() => handleProtectedNavigation("/report-found")}
                className="rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md active:scale-95"
              >
                Report Found
              </button>
              <button
                type="button"
                onClick={() => handleProtectedNavigation("/report-lost")}
                className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md active:scale-95"
              >
                Report Lost
              </button>
              <ThemeToggle />
            </nav>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-10 pt-10">
          <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div className="rounded-[2rem] border border-slate-200 bg-white/60 p-8 shadow-sm transition-all duration-300 hover:shadow-md sm:p-10 dark:border-slate-800 dark:bg-white/10">
              <p className="mb-4 inline-flex rounded-full border border-slate-200 bg-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-[0.32em] text-indigo-600 dark:border-slate-700 dark:bg-white/10 dark:text-indigo-300">
                Trusted across campus
              </p>
              <h2 className="max-w-2xl text-4xl font-semibold leading-tight text-[var(--text)] dark:text-white sm:text-6xl">
                Reconnect people with the things that matter most.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600 dark:text-gray-300 sm:text-lg">
                A fast, student-friendly portal to report missing belongings, search recent
                activity, and help lost items find their way home.
              </p>

              <div className="mx-auto mt-8 max-w-3xl rounded-2xl border border-slate-200 bg-white/60 p-6 text-slate-800 shadow-sm transition-all duration-300 hover:shadow-md dark:border-slate-700 dark:bg-white/10 dark:text-white">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold text-[var(--text)] dark:text-white">
                      Search and manage items
                    </h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
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
                      className="w-full rounded-xl border border-slate-300 bg-white/60 px-4 py-2 pl-10 text-sm text-[var(--text)] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-white/10 dark:text-white"
                    />
                    <span className="absolute left-3 top-3 text-slate-400 dark:text-slate-400">
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
                          className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm font-medium transition duration-200 ease-in-out ${
                            isActive
                              ? "border-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 text-white shadow-md"
                              : "border-slate-200 bg-white/60 text-slate-700 hover:bg-slate-50 hover:text-[var(--text)] dark:border-slate-700 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/20 dark:hover:text-white"
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
                      className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2 text-white font-medium shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md active:scale-95"
                    >
                      + Report Lost
                    </button>
                    <button
                      type="button"
                      onClick={() => handleProtectedNavigation("/report-found")}
                      className="rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-2 text-white font-medium shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-md active:scale-95"
                    >
                      + Report Found
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-[1.75rem] border border-slate-200 bg-white/60 p-6 shadow-sm transition-all duration-300 hover:shadow-md dark:border-slate-800 dark:bg-white/10 dark:hover:shadow-xl"
                >
                  <p className="text-sm uppercase tracking-[0.25em] text-slate-500 dark:text-gray-500">
                    {stat.label}
                  </p>
                  <p className="mt-3 text-4xl font-semibold text-[var(--text)] dark:text-white">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section
            id="recent-items"
            className="rounded-[2rem] border border-slate-200 bg-white/60 p-8 shadow-sm sm:p-10 dark:border-slate-800 dark:bg-white/10"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-300">
                  Recent activity
                </p>
                <h3 className="mt-2 text-3xl font-semibold text-[var(--text)] dark:text-white">
                  Submitted items appear here instantly
                </h3>
              </div>
              <p className="text-sm text-slate-500 dark:text-gray-300">
                Showing {filteredItems.length} of {items.length} reports
                {isLoading ? " | Updating..." : ""}
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  showContactNumber={Boolean(currentUser)}
                  canResolve={Boolean(currentUser) && isItemOwner(item.userEmail, currentUser?.email)}
                  canClaim={Boolean(currentUser) && !isItemOwner(item.userEmail, currentUser?.email)}
                  isBusy={pendingItemId === item.id}
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
              <div className="mt-8 rounded-[1.5rem] border border-dashed border-slate-300 bg-white/60 px-6 py-10 text-center text-slate-500 dark:border-slate-700 dark:bg-white/10 dark:text-gray-300">
                No matching items yet. Try a different keyword or submit a new report.
              </div>
            ) : null}
          </section>
        </main>
      </div>

      {claimingItem ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/45 px-5">
          <div className="w-full max-w-xl rounded-[2rem] border border-slate-200 bg-white/60 p-6 shadow-xl sm:p-8 dark:border-slate-700 dark:bg-white/10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-300">
                  Claim Request
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-[var(--text)] dark:text-white">
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
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 dark:border-slate-700 dark:text-gray-300 dark:hover:bg-white/10"
              >
                X
              </button>
            </div>

            <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-gray-300">
              Tell the finder why this item belongs to you. Share details like brand, markings, or
              what was inside.
            </p>

            <label
              htmlFor="claim-message"
              className="mt-6 block text-sm font-semibold text-[var(--text)] dark:text-white"
            >
              Why this is your item?
            </label>
            <textarea
              id="claim-message"
              rows={6}
              value={claimMessage}
              onChange={(event) => setClaimMessage(event.target.value)}
              placeholder="Example: The bag has my student ID in the front pocket and a blue charger inside."
              className="mt-2 w-full rounded-[1.35rem] border border-slate-300 bg-white/60 px-4 py-4 text-sm text-[var(--text)] outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-white/10 dark:text-white"
            />

            {claimError ? (
              <div className="mt-4 rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
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
                className="rounded-xl border border-slate-300 bg-white/60 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/20"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleClaimSubmit()}
                disabled={isSubmittingClaim}
                className="rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 px-4 py-2 text-sm font-medium text-white shadow-md hover:shadow-lg hover:scale-[1.03] transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-70"
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
