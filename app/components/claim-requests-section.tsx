"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import type { Claim } from "@/lib/claim-shared";

type ClaimRequestsSectionProps = {
  showHeader?: boolean;
};

export function ClaimRequestsSection({ showHeader = true }: ClaimRequestsSectionProps) {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingClaimId, setPendingClaimId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const fetchClaims = async () => {
      try {
        setIsLoading(true);
        setError("");

        const response = await fetch("/api/claim?view=received", {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Unable to fetch claims.");
        }

        const data = (await response.json()) as Claim[];
        setClaims(data);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setError("Unable to load claim requests right now.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void fetchClaims();

    return () => controller.abort();
  }, []);

  async function handleAction(claimId: string, action: "approve" | "reject") {
    setPendingClaimId(claimId);
    setError("");

    try {
      const response = await fetch(`/api/claim/${claimId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; claim?: Claim }
        | null;

      if (!response.ok || !payload?.claim) {
        throw new Error(payload?.error ?? "Unable to update claim.");
      }

      setClaims((current) =>
        current.map((claim) => (claim.id === payload.claim?.id ? payload.claim : claim)),
      );
    } catch (error) {
      setError((error as Error).message || "Unable to update claim right now.");
    } finally {
      setPendingClaimId(null);
    }
  }

  return (
    <section>
      {showHeader ? (
        <>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700">
            Finder workflow
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-[var(--text)]">Claim Requests</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Review incoming claim requests, approve the right one, and move the conversation into
            chat.
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
          Loading claim requests...
        </div>
      ) : claims.length ? (
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {claims.map((claim) => (
            <article
              key={claim.id}
              className="rounded-[1.5rem] border border-white/45 bg-white/60 p-5 shadow-[0_16px_48px_rgba(15,23,42,0.08)] dark:bg-white/10"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
                    {claim.itemTitle}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-[var(--text)]">{claim.ownerEmail}</h3>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${
                    claim.status === "approved"
                      ? "bg-emerald-100 text-emerald-800"
                      : claim.status === "rejected"
                        ? "bg-rose-100 text-rose-700"
                        : claim.status === "completed"
                          ? "bg-emerald-200 text-emerald-900"
                          : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {claim.status}
                </span>
              </div>

              <p className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-600">
                {claim.message || "No initial message provided."}
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={claim.status !== "pending" || pendingClaimId === claim.id}
                  onClick={() => void handleAction(claim.id, "approve")}
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {pendingClaimId === claim.id ? "Working..." : "Approve"}
                </button>
                <button
                  type="button"
                  disabled={claim.status !== "pending" || pendingClaimId === claim.id}
                  onClick={() => void handleAction(claim.id, "reject")}
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Reject
                </button>
                {claim.status === "approved" || claim.status === "completed" ? (
                  <Link
                    href={`/chat/${claim.id}`}
                    className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white/60 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:bg-white/10 dark:text-slate-200"
                  >
                    Open Chat
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50/80 px-6 py-10 text-center text-slate-500">
          No claim requests yet.
        </div>
      )}
    </section>
  );
}
