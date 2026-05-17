"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

import type { Claim } from "@/lib/claim-shared";

type ClaimRequestsSectionProps = {
  showHeader?: boolean;
  variant?: "ownership" | "finder-response";
};

type RequestView = "sent" | "received";

const requestViews: RequestView[] = ["sent", "received"];

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

function getEmailInitial(email: string) {
  return email.trim().charAt(0).toUpperCase() || "U";
}

function getStatusClass(status: Claim["status"]) {
  if (status === "rejected") {
    return "badge-danger";
  }

  if (status === "pending") {
    return "badge-warning";
  }

  return "badge-success";
}

export function ClaimRequestsSection({
  showHeader = true,
  variant = "ownership",
}: ClaimRequestsSectionProps) {
  const isFinderResponse = variant === "finder-response";
  const [activeRequestView, setActiveRequestView] = useState<RequestView>("sent");
  const [claimsByView, setClaimsByView] = useState<Record<RequestView, Claim[]>>({
    sent: [],
    received: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [pendingClaimId, setPendingClaimId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const fetchClaims = useCallback(
    async (options?: { signal?: AbortSignal; silent?: boolean }) => {
      try {
        if (!options?.silent) {
          setIsLoading(true);
          setError("");
        }

        const requestType = isFinderResponse ? "finder-response" : "ownership";
        const responses = await Promise.all(
          requestViews.map(async (view) => {
            const response = await fetch(`/api/claim?view=${view}&requestType=${requestType}`, {
              signal: options?.signal,
              cache: "no-store",
            });

            if (!response.ok) {
              throw new Error("Unable to fetch claims.");
            }

            return [view, (await response.json()) as Claim[]] as const;
          }),
        );

        setClaimsByView(Object.fromEntries(responses) as Record<RequestView, Claim[]>);
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

      setClaimsByView((current) => ({
        ...current,
        received: current.received.map((claim) =>
          claim.id === payload.claim?.id ? payload.claim : claim,
        ),
      }));
      void fetchClaims({ silent: true });
    } catch (error) {
      setError((error as Error).message || "Unable to update claim right now.");
    } finally {
      setPendingClaimId(null);
    }
  }

  const activeClaims = claimsByView[activeRequestView];

  function getViewSummary(view: RequestView) {
    if (isFinderResponse) {
      return view === "sent"
        ? "Responses you submitted on LOST item posts."
        : "Responses received on your LOST item posts.";
    }

    return view === "sent"
      ? "Claim requests you sent on FOUND item posts."
      : "Claim requests received on your FOUND item posts.";
  }

  function renderParticipant(claim: Claim, view: RequestView) {
    const isSent = view === "sent";
    const participantLabel = isSent
      ? isFinderResponse
        ? "Item owner"
        : "Finder"
      : isFinderResponse
        ? "Finder"
        : "Claimant";
    const participantName = isSent
      ? claim.finderEmail
      : claim.requesterName || claim.ownerEmail;
    const participantEmail = isSent ? claim.finderEmail : claim.ownerEmail;
    const showRequesterImage = !isSent && claim.requesterImage;

    return (
      <div className="mt-3 flex min-w-0 items-center gap-3">
        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--accent)] text-sm font-bold text-[var(--on-accent)] shadow-lg shadow-[var(--shadow)] ring-1 ring-white/20">
          {showRequesterImage ? (
            <Image
              src={claim.requesterImage ?? ""}
              alt=""
              fill
              sizes="44px"
              className="object-cover"
            />
          ) : isSent ? (
            getEmailInitial(participantEmail)
          ) : (
            getProfileInitial(claim)
          )}
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-[var(--text)]">
            {participantLabel}: {participantName}
          </h3>
          {!isSent && claim.requesterName ? (
            <p className="mt-1 truncate text-xs font-medium text-[var(--text-secondary)]">
              {participantEmail}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  function renderClaimCard(claim: Claim, view: RequestView) {
    const canOpenChat = claim.status === "approved" || claim.status === "completed";

    return (
      <article
        key={claim.id}
        className={`request-workflow-card request-workflow-card-${view} rounded-[1.5rem] border border-[var(--border)] bg-[var(--glass)] p-4 shadow-[0_16px_48px_var(--shadow)] sm:p-5`}
      >
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] eyebrow">
              Target item
            </p>
            <h3 className="mt-2 break-words text-lg font-semibold text-[var(--text)]">
              {claim.itemTitle}
            </h3>
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-[var(--text-muted)]">
              {claim.itemType === "lost"
                ? "Lost item"
                : claim.itemType === "found"
                  ? "Found item"
                  : isFinderResponse
                    ? "Lost item"
                    : "Found item"}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${getStatusClass(
              claim.status,
            )}`}
          >
            {claim.status}
          </span>
        </div>

        {renderParticipant(claim, view)}

        <p className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm leading-7 text-[var(--text-secondary)]">
          {claim.message ||
            (isFinderResponse ? "No found details provided." : "No initial message provided.")}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-medium text-[var(--text-secondary)]">
          <span>Submitted {formatDate(claim.createdAt)}</span>
          {claim.itemLocation ? <span className="break-words">Location: {claim.itemLocation}</span> : null}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {view === "received" ? (
            <>
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
            </>
          ) : null}
          {canOpenChat ? (
            <Link
              href={`/chat/${claim.id}`}
              className="claim-open-chat-btn btn-ghost min-h-11 rounded-2xl px-4 py-3 text-sm font-semibold"
            >
              Open Chat
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="btn-ghost min-h-11 rounded-2xl px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            >
              Chat Pending
            </button>
          )}
        </div>
      </article>
    );
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

      <div className="mt-6">
        <div className="grid gap-3 sm:grid-cols-2">
          {requestViews.map((view) => {
            const isActive = activeRequestView === view;

            return (
              <button
                key={view}
                type="button"
                onClick={() => setActiveRequestView(view)}
                className={`request-workflow-tab rounded-2xl px-4 py-4 text-left transition-all duration-200 ease-out sm:px-5 ${
                  isActive
                    ? "request-workflow-tab-active"
                    : "text-[var(--text-secondary)] hover:text-[var(--text)]"
                }`}
                aria-pressed={isActive}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="text-sm font-semibold capitalize">{view}</span>
                  </span>
                  <span className="request-workflow-count rounded-full px-2.5 py-1 text-xs font-semibold">
                    {claimsByView[view].length}
                  </span>
                </span>
                <span className="mt-1 block text-xs leading-5 text-[var(--text-secondary)]">
                  {getViewSummary(view)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <div className="mt-6 rounded-[1.25rem] alert-error px-4 py-3 text-sm">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-8 rounded-[1.5rem] panel-muted border-dashed px-6 py-10 text-center">
          {isFinderResponse ? "Loading finder responses..." : "Loading ownership claims..."}
        </div>
      ) : activeClaims.length ? (
        <div
          key={activeRequestView}
          className="request-tab-panel mt-8 grid gap-4 lg:grid-cols-2"
        >
          {activeClaims.map((claim) => renderClaimCard(claim, activeRequestView))}
        </div>
      ) : (
        <div
          key={activeRequestView}
          className="request-tab-panel mt-8 rounded-[1.5rem] panel-muted border-dashed px-6 py-10 text-center"
        >
          {isFinderResponse
            ? activeRequestView === "sent"
              ? "No finder responses sent yet."
              : "No finder responses received yet."
            : activeRequestView === "sent"
              ? "No ownership claims sent yet."
              : "No ownership claims received yet."}
        </div>
      )}
    </section>
  );
}
