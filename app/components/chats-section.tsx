"use client";

import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { Claim, ClaimRequestType } from "@/lib/claim-shared";

type ChatsSectionProps = {
  showHeader?: boolean;
};

type ChatWorkflow = ClaimRequestType;

type ChatWorkflowConfig = {
  label: string;
  shortLabel: string;
  summary: string;
  emptyMessage: string;
};

const chatWorkflows: ChatWorkflow[] = ["ownership", "finder-response"];
const chatActiveWorkflowStorageKey = "lost-found-profile-chat-workflow";

const chatWorkflowConfig: Record<ChatWorkflow, ChatWorkflowConfig> = {
  ownership: {
    label: "Ownership Claims Chats",
    shortLabel: "Ownership Claims",
    summary: "Claim requests on FOUND items and ownership verification conversations.",
    emptyMessage: "No ownership claim chats yet.",
  },
  "finder-response": {
    label: "Finder Responses Chats",
    shortLabel: "Finder Responses",
    summary: '"I Found This" responses on LOST items and finder-owner conversations.',
    emptyMessage: "No finder response chats yet.",
  },
};

function getInitialChatWorkflow(): ChatWorkflow {
  if (typeof window === "undefined") {
    return "ownership";
  }

  const storedWorkflow = window.sessionStorage.getItem(chatActiveWorkflowStorageKey);

  return storedWorkflow === "finder-response" ? "finder-response" : "ownership";
}

function getClaimWorkflow(claim: Claim): ChatWorkflow {
  if (claim.requestType === "finder-response" || claim.itemType === "lost") {
    return "finder-response";
  }

  return "ownership";
}

function formatChatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getInitial(value?: string) {
  return value?.trim().charAt(0).toUpperCase() || "U";
}

function getDisplayName(name: string, email: string, currentUserEmail: string) {
  return email.trim().toLowerCase() === currentUserEmail ? "You" : name;
}

function getParticipantDetails(claim: Claim, workflow: ChatWorkflow, currentUserEmail: string) {
  const primaryLabel = workflow === "finder-response" ? "Finder" : "Owner";
  const secondaryLabel = workflow === "finder-response" ? "Owner" : "Finder";
  const primaryName = claim.ownerName || claim.requesterName || claim.ownerEmail;
  const secondaryName = claim.finderName || claim.finderEmail;

  return {
    primaryLabel,
    secondaryLabel,
    primaryName: getDisplayName(primaryName, claim.ownerEmail, currentUserEmail),
    secondaryName: getDisplayName(secondaryName, claim.finderEmail, currentUserEmail),
    primaryEmail: claim.ownerEmail,
    secondaryEmail: claim.finderEmail,
    primaryImage: claim.ownerImage || claim.requesterImage,
  };
}

function getLatestPreview(claim: Claim, workflow: ChatWorkflow) {
  return (
    claim.latestMessage ||
    claim.message ||
    (workflow === "finder-response"
      ? "Open the chat to coordinate the finder response."
      : "Open the chat to coordinate ownership verification.")
  );
}

export function ChatsSection({ showHeader = true }: ChatsSectionProps) {
  const { data: session } = useSession();
  const currentUserEmail = session?.user?.email?.trim().toLowerCase() ?? "";
  const [activeWorkflow, setActiveWorkflow] = useState<ChatWorkflow>(getInitialChatWorkflow);
  const [claimsByWorkflow, setClaimsByWorkflow] = useState<Record<ChatWorkflow, Claim[]>>({
    ownership: [],
    "finder-response": [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchChats = useCallback(async (options?: { signal?: AbortSignal; silent?: boolean }) => {
    try {
      if (!options?.silent) {
        setIsLoading(true);
        setError("");
      }

      const responses = await Promise.all(
        chatWorkflows.map(async (workflow) => {
          const response = await fetch(`/api/claim?view=chat&requestType=${workflow}`, {
            signal: options?.signal,
            cache: "no-store",
          });

          if (!response.ok) {
            throw new Error("Unable to fetch chats.");
          }

          const claims = ((await response.json()) as Claim[]).filter(
            (claim) => getClaimWorkflow(claim) === workflow,
          );

          return [workflow, claims] as const;
        }),
      );

      setClaimsByWorkflow(Object.fromEntries(responses) as Record<ChatWorkflow, Claim[]>);
    } catch (error) {
      if ((error as Error).name !== "AbortError" && !options?.silent) {
        setError("Unable to load chats right now.");
      }
    } finally {
      if (!options?.signal?.aborted && !options?.silent) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    window.sessionStorage.setItem(chatActiveWorkflowStorageKey, activeWorkflow);
  }, [activeWorkflow]);

  useEffect(() => {
    const controller = new AbortController();

    void fetchChats({ signal: controller.signal });

    return () => controller.abort();
  }, [fetchChats]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchChats({ silent: true });
      }
    }, 8000);

    return () => window.clearInterval(intervalId);
  }, [fetchChats]);

  const activeClaims = claimsByWorkflow[activeWorkflow];
  const totalChats = useMemo(
    () => chatWorkflows.reduce((total, workflow) => total + claimsByWorkflow[workflow].length, 0),
    [claimsByWorkflow],
  );

  function renderChatCard(claim: Claim) {
    const workflow = getClaimWorkflow(claim);
    const details = getParticipantDetails(claim, workflow, currentUserEmail);
    const timestamp = claim.latestMessageAt || claim.createdAt;
    const unreadCount = claim.unreadCount ?? 0;
    const latestPreview = getLatestPreview(claim, workflow);

    return (
      <Link
        key={claim.id}
        href={`/chat/${claim.id}`}
        className={`chat-dashboard-card chat-dashboard-card-${workflow} rounded-[1.5rem] border border-[var(--border)] bg-[var(--glass)] p-4 shadow-[0_16px_48px_var(--shadow)] transition sm:p-5`}
      >
        <div className="flex min-w-0 items-start gap-4">
          <div className="chat-dashboard-avatar relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--accent)] text-sm font-bold text-[var(--on-accent)] shadow-lg shadow-[var(--shadow)] ring-1 ring-white/20">
            {details.primaryImage ? (
              <Image
                src={details.primaryImage}
                alt=""
                fill
                sizes="48px"
                className="object-cover"
              />
            ) : (
              getInitial(details.primaryName || details.primaryEmail)
            )}
            {claim.participantActive ? (
              <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[var(--surface)] bg-[var(--success)]" />
            ) : null}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] eyebrow">
                  {chatWorkflowConfig[workflow].shortLabel}
                </p>
                <h3 className="mt-1 truncate text-lg font-semibold text-[var(--text)]">
                  {claim.itemTitle}
                </h3>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <span className="whitespace-nowrap text-xs font-semibold text-[var(--text-muted)]">
                  {formatChatTime(timestamp)}
                </span>
                {unreadCount > 0 ? (
                  <span className="inline-flex min-h-6 min-w-6 items-center justify-center rounded-full bg-[var(--accent)] px-2 text-xs font-bold text-[var(--on-accent)] shadow-sm">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="mt-3 flex min-w-0 items-center gap-3">
              <div className="chat-dashboard-item-preview relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                {claim.itemImage ? (
                  <Image
                    src={claim.itemImage}
                    alt=""
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center px-2 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    Item
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="chat-dashboard-participant truncate text-sm font-semibold text-[var(--text)]">
                  {details.primaryLabel}: {details.primaryName}
                </p>
                <p className="mt-1 truncate text-xs font-medium text-[var(--text-secondary)]">
                  {details.secondaryLabel}: {details.secondaryName}
                </p>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">
                  {latestPreview}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  }

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

      <div className="mt-6">
        <div className="grid gap-3 sm:grid-cols-2">
          {chatWorkflows.map((workflow) => {
            const isActive = activeWorkflow === workflow;
            const config = chatWorkflowConfig[workflow];

            return (
              <button
                key={workflow}
                type="button"
                onClick={() => setActiveWorkflow(workflow)}
                className={`request-workflow-tab chat-dashboard-tab rounded-2xl px-4 py-4 text-left transition-all duration-200 ease-out sm:px-5 ${
                  isActive
                    ? "request-workflow-tab-active"
                    : "text-[var(--text-secondary)] hover:text-[var(--text)]"
                }`}
                aria-controls={`chat-panel-${workflow}`}
                aria-pressed={isActive}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-sm font-semibold">
                    {config.label}
                  </span>
                  <span className="request-workflow-count rounded-full px-2.5 py-1 text-xs font-semibold">
                    {claimsByWorkflow[workflow].length}
                  </span>
                </span>
                <span className="mt-1 block text-xs leading-5 text-[var(--text-secondary)]">
                  {config.summary}
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
          Loading chats...
        </div>
      ) : activeClaims.length ? (
        <div
          key={activeWorkflow}
          id={`chat-panel-${activeWorkflow}`}
          className="request-tab-panel mt-8 grid gap-4 lg:grid-cols-2"
        >
          {activeClaims.map((claim) => renderChatCard(claim))}
        </div>
      ) : (
        <div
          key={activeWorkflow}
          id={`chat-panel-${activeWorkflow}`}
          className="request-tab-panel mt-8 rounded-[1.5rem] panel-muted border-dashed px-6 py-10 text-center"
        >
          <p className="text-base font-semibold text-[var(--text)]">
            {chatWorkflowConfig[activeWorkflow].emptyMessage}
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[var(--text-secondary)]">
            {totalChats
              ? "Switch tabs to review your other active conversation flow."
              : "Approved requests will appear here as private handoff chats."}
          </p>
        </div>
      )}
    </section>
  );
}
