"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

import type { Claim, ChatMessage } from "@/lib/claim-shared";

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function ChatRoom() {
  const params = useParams<{ claimId: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const claimId = typeof params.claimId === "string" ? params.claimId : "";
  const currentUserEmail = session?.user?.email?.toLowerCase() ?? "";

  const [claim, setClaim] = useState<Claim | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    const fetchChat = async () => {
      try {
        setIsLoading(true);
        setError("");

        const response = await fetch(`/api/messages?claimId=${claimId}`, {
          signal: controller.signal,
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
          setError((error as Error).message || "Unable to load chat right now.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    if (claimId) {
      void fetchChat();
    }

    return () => controller.abort();
  }, [claimId]);

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
    <main className="relative min-h-screen overflow-hidden px-5 py-8 sm:px-8 lg:px-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.2),_transparent_26%),linear-gradient(180deg,_#f7fbff,_#edf7ff_55%,_#f8fafc)]" />
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[2rem] border border-white/35 bg-white/60 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:bg-white/10 sm:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700">
                Private chat
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-[var(--text)]">
                {claim?.itemTitle ?? "Claim Conversation"}
              </h1>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {otherParticipant ? `Chatting with ${otherParticipant}` : "Loading participant..."}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/profile"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white/60 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white/60 dark:bg-white/10 dark:text-slate-200"
              >
                Back to Profile
              </Link>
              <button
                type="button"
                onClick={() => void handleComplete()}
                disabled={!claim || claim.status !== "approved" || isCompleting}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isCompleting ? "Completing..." : "Mark as Completed"}
              </button>
            </div>
          </div>

          {error ? (
            <div className="mt-6 rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {isLoading ? (
            <div className="mt-8 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50/80 px-6 py-10 text-center text-slate-500">
              Loading chat...
            </div>
          ) : (
            <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_0.8fr]">
              <div className="rounded-[1.75rem] border border-white/45 bg-white/60 p-5 shadow-[0_16px_48px_rgba(15,23,42,0.08)] dark:bg-white/10">
                <div className="space-y-4">
                  {messages.length ? (
                    messages.map((entry) => {
                      const isOwnMessage = entry.senderEmail === currentUserEmail;

                      return (
                        <div
                          key={entry.id}
                          className={`flex ${isOwnMessage ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-xl rounded-[1.5rem] px-4 py-3 text-sm shadow-sm ${
                              isOwnMessage
                                ? "bg-sky-600 text-white"
                                : "border border-slate-200 bg-slate-50 text-slate-700"
                            }`}
                          >
                            <p>{entry.message}</p>
                            <p
                              className={`mt-2 text-xs ${
                                isOwnMessage ? "text-white/80" : "text-slate-400"
                              }`}
                            >
                              {formatTime(entry.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50/80 px-6 py-10 text-center text-slate-500">
                      No messages yet. Start the conversation below.
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-white/45 bg-white/60 p-5 shadow-[0_16px_48px_rgba(15,23,42,0.08)] dark:bg-white/10">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">
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
                  className="mt-4 w-full rounded-[1.35rem] border border-slate-200 bg-white/60 px-4 py-4 text-sm text-[var(--text)] outline-none placeholder:text-slate-400 focus:border-sky-300 disabled:cursor-not-allowed disabled:bg-slate-50 dark:bg-white/10 dark:text-slate-100 dark:placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => void handleSend()}
                  disabled={!claim || claim.status !== "approved" || !message.trim() || isSending}
                  className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-[1.25rem] bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-70"
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
