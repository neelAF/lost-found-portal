"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { Claim, ChatMessage } from "@/lib/claim-shared";

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function getWorkflowLabel(claim: Claim | null) {
  return claim?.itemType === "lost" ? "Finder Response Chat" : "Ownership Claim Chat";
}

function getParticipantLabel(claim: Claim | null, email: string) {
  if (!claim) {
    return "Participant";
  }

  if (claim.itemType === "lost") {
    return email === claim.ownerEmail ? "Finder" : "Owner";
  }

  return email === claim.ownerEmail ? "Owner" : "Finder";
}

function getParticipantName(claim: Claim | null, email: string) {
  if (!claim) {
    return email;
  }

  if (email === claim.ownerEmail) {
    return claim.ownerName || claim.requesterName || claim.ownerEmail;
  }

  if (email === claim.finderEmail) {
    return claim.finderName || claim.finderEmail;
  }

  return email;
}

function getParticipantImage(claim: Claim | null, email: string, currentUserEmail: string, currentUserImage: string) {
  if (email === currentUserEmail && currentUserImage) {
    return currentUserImage;
  }

  if (!claim) {
    return "";
  }

  if (email === claim.ownerEmail) {
    return claim.ownerImage || claim.requesterImage || "";
  }

  if (email === claim.finderEmail) {
    return claim.finderImage || "";
  }

  return "";
}

function getInitial(value: string) {
  return value.trim().charAt(0).toUpperCase() || "U";
}

export function ChatRoom() {
  const params = useParams<{ claimId: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const claimId = typeof params.claimId === "string" ? params.claimId : "";
  const currentUserEmail = session?.user?.email?.toLowerCase() ?? "";
  const currentUserImage = session?.user?.image ?? "";

  const [claim, setClaim] = useState<Claim | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState("");

  const fetchChat = useCallback(
    async (options?: { signal?: AbortSignal; silent?: boolean }) => {
      if (!claimId) {
        return;
      }

      try {
        if (!options?.silent) {
          setIsLoading(true);
          setError("");
        }

        const response = await fetch(`/api/messages?claimId=${claimId}`, {
          signal: options?.signal,
          cache: "no-store",
        });

        const payload = (await response.json().catch(() => null)) as
          | { error?: string; claim?: Claim; messages?: ChatMessage[] }
          | null;

        if (!response.ok || !payload?.claim || !payload?.messages) {
          throw new Error(payload?.error ?? "Unable to load chat.");
        }

        setClaim(payload.claim);
        setMessages(payload.messages);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          if (!options?.silent) {
            setError((error as Error).message || "Unable to load chat right now.");
          }
        }
      } finally {
        if (!options?.signal?.aborted && !options?.silent) {
          setIsLoading(false);
        }
      }
    },
    [claimId],
  );

  useEffect(() => {
    const controller = new AbortController();

    if (claimId) {
      void fetchChat({ signal: controller.signal });
    }

    return () => controller.abort();
  }, [claimId, fetchChat]);

  useEffect(() => {
    if (!claimId) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchChat({ silent: true });
      }
    }, 2500);

    return () => window.clearInterval(intervalId);
  }, [claimId, fetchChat]);

  const otherParticipant = useMemo(() => {
    if (!claim || !currentUserEmail) {
      return "";
    }

    return currentUserEmail === claim.ownerEmail ? claim.finderEmail : claim.ownerEmail;
  }, [claim, currentUserEmail]);

  async function handleSend() {
    if (!claim || !message.trim()) {
      return;
    }

    setIsSending(true);
    setError("");

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          claimId: claim.id,
          message,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; message?: ChatMessage }
        | null;

      if (!response.ok || !payload?.message) {
        throw new Error(payload?.error ?? "Unable to send message.");
      }

      setMessages((current) => [...current, payload.message as ChatMessage]);
      setMessage("");
    } catch (error) {
      setError((error as Error).message || "Unable to send message right now.");
    } finally {
      setIsSending(false);
    }
  }

  async function handleComplete() {
    if (!claim) {
      return;
    }

    setIsCompleting(true);
    setError("");

    try {
      const response = await fetch(`/api/claim/${claim.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action: "complete" }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; claim?: Claim }
        | null;

      if (!response.ok || !payload?.claim) {
        throw new Error(payload?.error ?? "Unable to complete claim.");
      }

      setClaim(payload.claim);
      router.refresh();
    } catch (error) {
      setError((error as Error).message || "Unable to complete claim right now.");
    } finally {
      setIsCompleting(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden px-5 py-8 sm:px-8 lg:px-10">
      <div className="app-background-layer absolute inset-0 -z-10" />
      <div className="mx-auto max-w-7xl">
        <div className="glass-card rounded-[2rem] p-6 shadow-[0_24px_80px_var(--shadow)] sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] eyebrow">
                {getWorkflowLabel(claim)}
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-[var(--text)]">
                {claim?.itemTitle ?? "Item Conversation"}
              </h1>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                {otherParticipant
                  ? `Chatting with ${getParticipantLabel(claim, otherParticipant)}: ${otherParticipant}`
                  : "Loading participant..."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="btn-ghost min-h-11 rounded-full px-5 py-2.5 text-sm font-medium"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => void handleComplete()}
                disabled={!claim || claim.status !== "approved" || isCompleting}
                className="btn-success min-h-11 rounded-full px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isCompleting ? "Completing..." : "Mark as Completed"}
              </button>
            </div>
          </div>

          {error ? (
            <div className="mt-6 rounded-[1.25rem] alert-error px-4 py-3 text-sm">
              {error}
            </div>
          ) : null}

          {isLoading ? (
            <div className="mt-8 rounded-[1.5rem] panel-muted border-dashed px-6 py-10 text-center">
              Loading chat...
            </div>
          ) : (
            <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_0.8fr]">
              <div className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--glass)] p-5 shadow-[0_16px_48px_var(--shadow)]">
                <div className="space-y-4">
                  {messages.length ? (
                    messages.map((entry) => {
                      const isOwnMessage = entry.senderEmail === currentUserEmail;
                      const senderName = getParticipantName(claim, entry.senderEmail);
                      const senderLabel = isOwnMessage
                        ? "You"
                        : getParticipantLabel(claim, entry.senderEmail);
                      const senderImage = getParticipantImage(
                        claim,
                        entry.senderEmail,
                        currentUserEmail,
                        currentUserImage,
                      );

                      return (
                        <div
                          key={entry.id}
                          className={`flex items-end gap-3 ${isOwnMessage ? "flex-row-reverse" : ""}`}
                        >
                          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--accent)] text-xs font-bold text-[var(--on-accent)] shadow-lg shadow-[var(--shadow)] ring-1 ring-white/20">
                            {senderImage ? (
                              <Image
                                src={senderImage}
                                alt=""
                                fill
                                sizes="40px"
                                className="object-cover"
                              />
                            ) : (
                              getInitial(senderName)
                            )}
                          </div>
                          <div
                            className={`max-w-[min(100%,42rem)] break-words rounded-[1.5rem] px-4 py-3 text-sm shadow-sm ${isOwnMessage
                                ? "bg-[var(--primary)] text-[var(--on-accent)]"
                                : "border border-[var(--border)] bg-[var(--surface)] text-[var(--text)]"
                              }`}
                          >
                            <p
                              className={`mb-1 text-xs font-semibold ${isOwnMessage ? "text-[var(--on-accent)]/85" : "text-[var(--text-secondary)]"
                                }`}
                            >
                              {senderLabel}
                            </p>
                            <p>{entry.message}</p>
                            <p
                              className={`mt-2 text-xs ${isOwnMessage ? "text-[var(--on-accent)]/80" : "text-[var(--text-secondary)]"
                                }`}
                            >
                              {formatTime(entry.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-[1.5rem] panel-muted border-dashed px-6 py-10 text-center">
                      No messages yet. Start the conversation below.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-[var(--border)] bg-[var(--glass)] p-5 shadow-[0_16px_48px_var(--shadow)]">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] eyebrow">
                  Message
                </p>
                <textarea
                  rows={12}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  disabled={!claim || claim.status !== "approved"}
                  placeholder={
                    claim?.status === "completed"
                      ? "This claim has been completed."
                      : "Write your message here..."
                  }
                  className="mt-4 w-full rounded-[1.35rem] glass-input px-4 py-4 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)] disabled:cursor-not-allowed disabled:bg-[var(--surface)]"
                />
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={!claim || claim.status !== "approved" || !message.trim() || isSending}
                  className="mt-4 btn-primary min-h-12 w-full rounded-[1.25rem] px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSending ? "Sending..." : "Send Message"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
