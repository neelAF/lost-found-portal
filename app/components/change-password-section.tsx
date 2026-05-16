"use client";

import { useSession } from "next-auth/react";
import { FormEvent, useState } from "react";

import { PasswordInput } from "@/app/components/password-input";

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
        <div className="rounded-[1.25rem] border border-dashed border-[var(--border)] bg-[var(--surface)] px-4 py-6 text-sm text-[var(--text-secondary)]">
          Login to take action.
        </div>
      ) : null}

      {showHeader ? (
        <>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] eyebrow">
            Account security
          </p>
          <h2 className="mt-2 text-3xl font-semibold text-[var(--text)]">Change Password</h2>
          <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
            Signed in as{" "}
            <span className="font-semibold text-[var(--text)]">{currentUser?.email}</span>
          </p>
        </>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label htmlFor="oldPassword" className="mb-2 block text-sm font-semibold text-[var(--text)]">
            Old Password
          </label>
          <PasswordInput
            id="oldPassword"
            required
            value={oldPassword}
            onChange={(event) => setOldPassword(event.target.value)}
            placeholder="Enter your current password"
          />
        </div>

        <div>
          <label htmlFor="newPassword" className="mb-2 block text-sm font-semibold text-[var(--text)]">
            New Password
          </label>
          <PasswordInput
            id="newPassword"
            required
            minLength={6}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="At least 6 characters"
          />
        </div>

        {error ? (
          <div className="rounded-[1.25rem] alert-error px-4 py-3 text-sm">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-[1.25rem] alert-success px-4 py-3 text-sm">
            {success}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting || !currentUser}
          className="recent-action-btn btn-primary min-h-13 w-full rounded-[1.35rem] px-6 py-4 text-sm font-semibold shadow-sm active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Updating..." : "Update Password"}
        </button>
      </form>
    </section>
  );
}
