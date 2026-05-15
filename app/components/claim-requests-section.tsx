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
          <p className="text-sm font-semibold uppercase tracking-[0.3em] eyebrow">
            Finder workflow
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-[var(--text)]">Claim Requests</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
            Review incoming claim requests, approve the right one, and move the conversation into
            chat.
          </p>
        </>
      ) : null}

      {error ? (
        <div className="mt-6 rounded-[1.25rem] alert-error px-4 py-3 text-sm">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-8 rounded-[1.5rem] panel-muted border-dashed px-6 py-10 text-center">
          Loading claim requests...
        </div>
      ) : claims.length ? (
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {claims.map((claim) => (
            <article
              key={claim.id}
              className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--glass)] p-5 shadow-[0_16px_48px_var(--shadow)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] eyebrow">
                    {claim.itemTitle}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-[var(--text)]">{claim.ownerEmail}</h3>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${
                    claim.status === "rejected"
                      ? "badge-danger"
                      : claim.status === "pending"
                        ? "badge-warning"
                        : "badge-success"
                  }`}
                >
                  {claim.status}
                </span>
              </div>

              <p className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm leading-7 text-[var(--text-secondary)]">
                {claim.message || "No initial message provided."}
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={claim.status !== "pending" || pendingClaimId === claim.id}
                  onClick={() => void handleAction(claim.id, "approve")}
                  className="claim-approve-btn btn-success min-h-11 rounded-2xl px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {pendingClaimId === claim.id ? "Working..." : "Approve"}
                </button>
                <button
                  type="button"
                  disabled={claim.status !== "pending" || pendingClaimId === claim.id}
                  onClick={() => void handleAction(claim.id, "reject")}
                  className="claim-reject-btn btn-danger min-h-11 rounded-2xl px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Reject
                </button>
                {claim.status === "approved" || claim.status === "completed" ? (
                  <Link
                    href={`/chat/${claim.id}`}
                    className="claim-open-chat-btn btn-ghost min-h-11 rounded-2xl px-4 py-3 text-sm font-semibold"
                  >
                    Open Chat
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-[1.5rem] panel-muted border-dashed px-6 py-10 text-center">
          No claim requests yet.
        </div>
      )}
    </section>
  );
}
