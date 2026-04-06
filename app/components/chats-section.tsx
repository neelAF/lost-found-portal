"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { Claim } from "@/lib/claim-shared";

type ChatsSectionProps = {
  showHeader?: boolean;
};

export function ChatsSection({ showHeader = true }: ChatsSectionProps) {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const fetchChats = async () => {
      try {
        setIsLoading(true);
        setError("");

        const response = await fetch("/api/claim?view=chat", {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Unable to fetch chats.");
        }

        const data = (await response.json()) as Claim[];
        setClaims(data);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setError("Unable to load chats right now.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void fetchChats();

    return () => controller.abort();
  }, []);

  return (
    <section>
      {showHeader ? (
        <>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700">
            Active conversations
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-[var(--text)]">Chats</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Approved claims become private chats between the claimer and the finder.
          </p>
        </>
      ) : null}

      {error ? (
        <div className="mt-6 rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-8 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50/80 px-6 py-10 text-center text-slate-500">
          Loading chats...
        </div>
      ) : claims.length ? (
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {claims.map((claim) => (
            <Link
              key={claim.id}
              href={`/chat/${claim.id}`}
              className="rounded-[1.5rem] border border-white/45 bg-white/60 p-5 shadow-[0_16px_48px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_56px_rgba(15,23,42,0.12)] dark:bg-white/10"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
                    {claim.itemTitle}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-[var(--text)]">
                    {claim.ownerEmail}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">Finder: {claim.finderEmail}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${
                    claim.status === "completed"
                      ? "bg-emerald-200 text-emerald-900"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {claim.status}
                </span>
              </div>

              <p className="mt-4 text-sm leading-7 text-slate-600">
                {claim.message || "Open the chat to coordinate the handoff."}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50/80 px-6 py-10 text-center text-slate-500">
          No approved chats yet.
        </div>
      )}
    </section>
  );
}
