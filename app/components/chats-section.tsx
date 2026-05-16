"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { Claim } from "@/lib/claim-shared";

type ChatsSectionProps = {
  showHeader?: boolean;
};

function getWorkflowLabel(claim: Claim) {
  return claim.itemType === "lost" ? "Finder Response" : "Ownership Claim";
}

function getPrimaryParticipantLabel(claim: Claim) {
  return claim.itemType === "lost" ? "Finder" : "Claimant";
}

function getSecondaryParticipantLabel(claim: Claim) {
  return claim.itemType === "lost" ? "Owner" : "Finder";
}

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
          <p className="text-sm font-semibold uppercase tracking-[0.3em] eyebrow">
            Active conversations
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-[var(--text)]">Chats</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
            Approved ownership claims and accepted finder responses become private handoff chats.
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
          Loading chats...
        </div>
      ) : claims.length ? (
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {claims.map((claim) => (
            <Link
              key={claim.id}
              href={`/chat/${claim.id}`}
              className="rounded-[1.5rem] border border-[var(--border)] bg-[var(--glass)] p-5 shadow-[0_16px_48px_var(--shadow)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_56px_var(--shadow)] "
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] eyebrow">
                    {getWorkflowLabel(claim)}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-[var(--text)]">
                    {claim.itemTitle}
                  </h3>
                  <p className="mt-2 text-sm text-[var(--text-muted)]">
                    {getPrimaryParticipantLabel(claim)}:{" "}
                    {claim.requesterName || claim.ownerEmail}
                  </p>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    {getSecondaryParticipantLabel(claim)}: {claim.finderEmail}
                  </p>
                </div>
                <span
                  className="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] badge-success"
                >
                  {claim.status}
                </span>
              </div>

              <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">
                {claim.message || "Open the chat to coordinate the handoff."}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-[1.5rem] panel-muted border-dashed px-6 py-10 text-center">
          No approved chats yet.
        </div>
      )}
    </section>
  );
}
