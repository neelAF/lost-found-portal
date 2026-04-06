"use client";

import { useSession } from "next-auth/react";
import { FormEvent, useState } from "react";

type ChangePasswordSectionProps = {
  showHeader?: boolean;
};

export function ChangePasswordSection({ showHeader = true }: ChangePasswordSectionProps) {
  const { data: session } = useSession();
  const currentUser = session?.user ?? null;
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!currentUser?.email) {
      setError("Login to take action");
      setSuccess("");
      return;
    }

    setError("");
    setSuccess("");
    setIsSubmitting(true);

    const response = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: currentUser.email,
        oldPassword,
        newPassword,
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string; message?: string }
      | null;

    if (!response.ok) {
      setError(payload?.error ?? "Unable to change password right now.");
      setIsSubmitting(false);
      return;
    }

    setSuccess(payload?.message ?? "Password updated successfully.");
    setOldPassword("");
    setNewPassword("");
    setIsSubmitting(false);
  }

  return (
    <section>
      {!currentUser ? (
        <div className="rounded-[1.25rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-600">
          Login to take action.
        </div>
      ) : null}

      {showHeader ? (
        <>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700">
            Account security
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-[var(--text)]">Change Password</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Signed in as{" "}
            <span className="font-semibold text-slate-800">{currentUser?.email}</span>
          </p>
        </>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label htmlFor="oldPassword" className="mb-2 block text-sm font-semibold text-slate-700">
            Old Password
          </label>
          <input
            id="oldPassword"
            type="password"
            required
            value={oldPassword}
            onChange={(event) => setOldPassword(event.target.value)}
            className="w-full rounded-[1.35rem] border border-white/45 bg-white/60 px-4 py-4 text-sm text-[var(--text)] shadow-inner shadow-white/60 outline-none placeholder:text-slate-400 focus:border-sky-300 dark:bg-white/10 dark:text-slate-100 dark:placeholder:text-slate-400"
            placeholder="Enter your current password"
          />
        </div>

        <div>
          <label htmlFor="newPassword" className="mb-2 block text-sm font-semibold text-slate-700">
            New Password
          </label>
          <input
            id="newPassword"
            type="password"
            required
            minLength={6}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            className="w-full rounded-[1.35rem] border border-white/45 bg-white/60 px-4 py-4 text-sm text-[var(--text)] shadow-inner shadow-white/60 outline-none placeholder:text-slate-400 focus:border-sky-300 dark:bg-white/10 dark:text-slate-100 dark:placeholder:text-slate-400"
            placeholder="At least 6 characters"
          />
        </div>

        {error ? (
          <div className="rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting || !currentUser}
          className="inline-flex min-h-13 w-full items-center justify-center rounded-[1.35rem] bg-sky-600 px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:bg-sky-700 hover:shadow-sky-500/35 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Updating..." : "Update Password"}
        </button>
      </form>
    </section>
  );
}
