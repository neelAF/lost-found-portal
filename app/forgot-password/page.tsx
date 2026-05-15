"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string; message?: string }
      | null;

    if (!response.ok) {
      setError(payload?.error ?? "Unable to send OTP right now.");
      setIsSubmitting(false);
      return;
    }

    setSuccess(payload?.message ?? "OTP sent.");
    setIsSubmitting(false);
    router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden px-5 py-8 sm:px-8 lg:px-10">
      <div className="app-background-layer absolute inset-0 -z-10" />
      <div className="mx-auto max-w-md">
        <div className="glass-card rounded-[2rem] p-6 shadow-[0_24px_80px_var(--shadow)] sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] eyebrow">
                Password help
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-[var(--text)]">Forgot Password</h1>
            </div>
            <Link
              href="/login"
              className="btn-ghost min-h-11 rounded-full px-4 py-2 text-sm font-medium"
            >
              Login
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-[var(--text)]">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-[1.35rem] glass-input px-4 py-4 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-secondary)] focus:border-[var(--primary)]"
                placeholder="you@example.com"
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
              disabled={isSubmitting}
              className="btn-primary min-h-13 w-full rounded-[1.35rem] px-6 py-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Sending OTP..." : "Send OTP"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
