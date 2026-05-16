"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

import type { Claim } from "@/lib/claim-shared";

type ClaimRequestsSectionProps = {
  showHeader?: boolean;
  variant?: "ownership" | "finder-response";
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getProfileInitial(claim: Claim) {
  return (claim.requesterName || claim.ownerEmail).trim().charAt(0).toUpperCase() || "U";
}

export function ClaimRequestsSection({
  showHeader = true,
  variant = "ownership",
}: ClaimRequestsSectionProps) {
  const isFinderResponse = variant === "finder-response";
  const [claims, setClaims] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingClaimId, setPendingClaimId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchClaims = useCallback(
    async (options?: { signal?: AbortSignal; silent?: boolean }) => {
      try {
        if (!options?.silent) {
          setIsLoading(true);
        }
        if (!options?.silent) {
          setError("");
        }

        const response = await fetch(
          `/api/claim?view=received&requestType=${
            isFinderResponse ? "finder-response" : "ownership"
          }`,
          {
            signal: options?.signal,
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error("Unable to fetch claims.");
        }

        const data = (await response.json()) as Claim[];
        setClaims(data);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          if (!options?.silent) {
            setError(
              isFinderResponse
                ? "Unable to load finder responses right now."
                : "Unable to load ownership claims right now.",
            );
          }
        }
      } finally {
        if (!options?.signal?.aborted && !options?.silent) {
          setIsLoading(false);
        }
      }
    },
    [isFinderResponse],
  );

  useEffect(() => {
    const controller = new AbortController();

    void fetchClaims({ signal: controller.signal });

    return () => controller.abort();
  }, [fetchClaims]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void fetchClaims({ silent: true });
    }, 8000);

    return () => window.clearInterval(intervalId);
  }, [fetchClaims]);

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
      void fetchClaims({ silent: true });
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
            {isFinderResponse ? "Owner workflow" : "Finder workflow"}
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-[var(--text)]">
            {isFinderResponse ? "Finder Responses" : "Ownership Claims"}
          </h2>
          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
            {isFinderResponse
              ? "Review responses from people who found your lost items and move trusted matches into chat."
              : "Review incoming claim requests, approve the right one, and move the conversation into chat."}
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
          {isFinderResponse ? "Loading finder responses..." : "Loading ownership claims..."}
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
                  <div className="mt-3 flex items-center gap-3">
                    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--accent)] text-sm font-bold text-[var(--on-accent)] shadow-lg shadow-[var(--shadow)] ring-1 ring-white/20">
                      {claim.requesterImage ? (
                        <Image
                          src={claim.requesterImage}
                          alt=""
                          fill
                          sizes="44px"
                          className="object-cover"
                        />
                      ) : (
                        getProfileInitial(claim)
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[var(--text)]">
                        {isFinderResponse ? "Finder" : "Claimant"}:{" "}
                        {claim.requesterName || claim.ownerEmail}
                      </h3>
                      {claim.requesterName ? (
                        <p className="mt-1 text-xs font-medium text-[var(--text-secondary)]">
                          {claim.ownerEmail}
                        </p>
                      ) : null}
                    </div>
                  </div>
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
                {claim.message ||
                  (isFinderResponse
                    ? "No found details provided."
                    : "No initial message provided.")}
              </p>

              <p className="mt-3 text-xs font-medium text-[var(--text-secondary)]">
                Submitted {formatDate(claim.createdAt)}
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={claim.status !== "pending" || pendingClaimId === claim.id}
                  onClick={() => void handleAction(claim.id, "approve")}
                  className="claim-approve-btn btn-success min-h-11 rounded-2xl px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {pendingClaimId === claim.id
                    ? "Working..."
                    : isFinderResponse
                      ? "Accept"
                      : "Approve"}
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
          {isFinderResponse ? "No finder responses yet." : "No ownership claims yet."}
        </div>
      )}
    </section>
  );
}
