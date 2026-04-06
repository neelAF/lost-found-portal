"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { LostItem } from "@/lib/lost-item-shared";
import { ItemCard } from "./item-card";

type MyItemsSectionProps = {
  showHeader?: boolean;
};

export function MyItemsSection({ showHeader = true }: MyItemsSectionProps) {
  const [items, setItems] = useState<LostItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const fetchItems = async () => {
      try {
        setIsLoading(true);
        setError("");

        const response = await fetch("/api/my-items", {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Unable to fetch your items.");
        }

        const data = (await response.json()) as LostItem[];
        setItems(data);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setError("Unable to load your items right now.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void fetchItems();

    return () => controller.abort();
  }, []);

  async function handleResolve(itemId: string) {
    setPendingItemId(itemId);
    setError("");

    try {
      const response = await fetch(`/api/my-items/${itemId}`, {
        method: "PATCH",
      });

      if (!response.ok) {
        throw new Error("Unable to update your item.");
      }

      const payload = (await response.json()) as { item?: LostItem };

      if (!payload.item) {
        throw new Error("Updated item was not returned.");
      }

      setItems((current) =>
        current.map((item) => (item.id === payload.item?.id ? payload.item : item)),
      );
    } catch (error) {
      setError("Unable to update your item right now.");
      console.error(error);
    } finally {
      setPendingItemId(null);
    }
  }

  async function handleDelete(itemId: string) {
    setPendingItemId(itemId);
    setError("");

    try {
      const response = await fetch(`/api/my-items/${itemId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Unable to delete your item.");
      }

      setItems((current) => current.filter((item) => item.id !== itemId));
    } catch (error) {
      setError("Unable to delete your item right now.");
      console.error(error);
    } finally {
      setPendingItemId(null);
    }
  }

  return (
    <section>
      {showHeader ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700">
              Private dashboard
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-[var(--text)]">My Items</h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Review what you posted, resolve active reports, and remove items you no longer want
              listed.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/report-lost"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-700"
            >
              Report Lost
            </Link>
            <Link
              href="/report-found"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-700"
            >
              Report Found
            </Link>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="mt-6 rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-8 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50/80 px-6 py-10 text-center text-slate-500">
          Loading your items...
        </div>
      ) : items.length ? (
        <div className="mt-8 grid grid-cols-1 gap-6 items-stretch sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              showContactNumber
              canResolve
              canDelete
              isBusy={pendingItemId === item.id}
              onResolve={handleResolve}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50/80 px-6 py-10 text-center text-slate-500">
          You haven&apos;t posted any items yet.
        </div>
      )}
    </section>
  );
}
