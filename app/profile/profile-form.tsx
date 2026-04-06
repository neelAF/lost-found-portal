"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

import { ChatsSection } from "@/app/components/chats-section";
import { ChangePasswordSection } from "@/app/components/change-password-section";
import { ClaimRequestsSection } from "@/app/components/claim-requests-section";
import { MyItemsSection } from "@/app/components/my-items-section";

type ProfileResponse = {
  name: string;
  email: string;
  createdAt: string;
};

type ProfileTab = "items" | "claims" | "chats" | "password";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function ProfileForm() {
  const { data: session, update } = useSession();
  const currentUser = session?.user ?? null;
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [name, setName] = useState("");
  const [activeTab, setActiveTab] = useState<ProfileTab>("items");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const displayName = name.trim() || profile?.name || currentUser?.name || "User";
  const avatarLetter = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    const controller = new AbortController();

    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        setError("");

        const response = await fetch("/api/user", {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Unable to load profile.");
        }

        const data = (await response.json()) as ProfileResponse;
        setProfile(data);
        setName(data.name);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setError("Unable to load your profile right now.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void fetchProfile();

    return () => controller.abort();
  }, []);

  async function handleUpdate(nextName?: string) {
    if (!currentUser) {
      return;
    }

    setError("");
    setSuccess("");
    setIsSaving(true);

    const resolvedName = nextName ?? name;

    const response = await fetch("/api/user", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: resolvedName }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string; user?: ProfileResponse }
      | null;

    if (!response.ok || !payload?.user) {
      setError(payload?.error ?? "Unable to update your profile right now.");
      setIsSaving(false);
      return;
    }

    setProfile(payload.user);
    setName(payload.user.name);
    setSuccess("Profile updated successfully.");
    await update({
      ...session,
      user: {
        ...currentUser,
        name: payload.user.name,
      },
    });
    setIsSaving(false);
  }

  function handleEditClick() {
    const nextName = window.prompt("Update your display name", displayName)?.trim();

    if (!nextName || nextName === name) {
      return;
    }

    setName(nextName);
    void handleUpdate(nextName);
  }

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-10 before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.15),transparent_60%)] before:content-['']">
      <div className="relative z-10 mx-auto max-w-4xl space-y-6 px-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-300">
              Account profile
            </p>
            <h1 className="text-xl font-semibold text-white">Your Profile</h1>
            <p className="text-sm text-slate-400">
              Manage your account, posted items, claim workflow, and private chats.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/60 px-4 py-2 text-sm font-medium text-slate-700 transition duration-300 hover:bg-white/60 hover:text-slate-950 hover:shadow-xl dark:bg-white/10 dark:text-slate-300 dark:hover:text-white"
          >
            Home
          </Link>
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-white/10 bg-white/60 px-6 py-10 text-center text-sm text-slate-600 backdrop-blur-xl dark:bg-white/10 dark:text-slate-400">
            Loading profile...
          </div>
        ) : !currentUser ? (
          <div className="rounded-2xl border border-white/10 bg-white/60 px-6 py-10 text-center text-sm text-slate-600 backdrop-blur-xl dark:bg-white/10 dark:text-slate-400">
            Login to view your profile.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/60 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.4)] backdrop-blur-xl transition duration-300 hover:shadow-[0_12px_36px_rgba(0,0,0,0.45)] dark:bg-white/10">
              <div className="flex flex-col gap-6 md:flex-row md:items-center">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-xl font-bold text-white shadow-md ring-2 ring-white/10">
                    {avatarLetter}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">{displayName}</h2>
                    <p className="text-sm text-slate-400">{profile?.email ?? currentUser.email}</p>
                  </div>
                </div>

                <div className="ml-auto flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleEditClick()}
                    disabled={isSaving}
                    className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2 text-sm text-white shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {isSaving ? "Saving..." : "Edit"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void signOut({ callbackUrl: "/" })}
                    className="rounded-xl border border-white/10 bg-white/60 px-4 py-2 text-sm text-slate-700 transition-all duration-200 hover:bg-white/60 hover:text-slate-950 dark:bg-white/10 dark:text-slate-300 dark:hover:text-white"
                  >
                    Logout
                  </button>
                </div>
              </div>

              <div className="mt-4 text-xs text-slate-500">
                Joined: {profile?.createdAt ? formatDate(profile.createdAt) : "-"}
              </div>

              {error ? (
                <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
                  {error}
                </div>
              ) : null}

              {success ? (
                <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                  {success}
                </div>
              ) : null}
            </div>

            <div className="my-4 border-t border-white/10"></div>

            <div className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-white/60 p-2 shadow-[0_8px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl dark:bg-white/10">
              <button
                type="button"
                onClick={() => setActiveTab("items")}
                className={`px-4 py-1.5 text-sm rounded-lg transition ${
                  activeTab === "items"
                    ? "bg-white/60 text-slate-950 dark:bg-white/10 dark:text-white"
                    : "text-slate-700 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-white/10"
                }`}
              >
                My Items
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("claims")}
                className={`px-4 py-1.5 text-sm rounded-lg transition ${
                  activeTab === "claims"
                    ? "bg-white/60 text-slate-950 dark:bg-white/10 dark:text-white"
                    : "text-slate-700 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-white/10"
                }`}
              >
                Claim Requests
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("chats")}
                className={`px-4 py-1.5 text-sm rounded-lg transition ${
                  activeTab === "chats"
                    ? "bg-white/60 text-slate-950 dark:bg-white/10 dark:text-white"
                    : "text-slate-700 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-white/10"
                }`}
              >
                Chats
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("password")}
                className={`px-4 py-1.5 text-sm rounded-lg transition ${
                  activeTab === "password"
                    ? "bg-white/60 text-slate-950 dark:bg-white/10 dark:text-white"
                    : "text-slate-700 hover:bg-white/60 dark:text-slate-300 dark:hover:bg-white/10"
                }`}
              >
                Change Password
              </button>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/60 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.28)] backdrop-blur-xl transition duration-300 hover:shadow-[0_12px_36px_rgba(0,0,0,0.38)] dark:bg-white/10">
              {activeTab === "items" ? (
                <MyItemsSection showHeader={false} />
              ) : activeTab === "claims" ? (
                <ClaimRequestsSection showHeader={false} />
              ) : activeTab === "chats" ? (
                <ChatsSection showHeader={false} />
              ) : (
                <ChangePasswordSection showHeader={false} />
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
