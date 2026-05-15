"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

export default function VerifyOtpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = useMemo(() => searchParams.get("email") ?? "", [searchParams]);
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const response = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, otp }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    if (!response.ok) {
      setError(payload?.error ?? "Unable to verify OTP right now.");
      setIsSubmitting(false);
      return;
    }

    router.push(`/reset-password?email=${encodeURIComponent(email)}`);
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden px-5 py-8 sm:px-8 lg:px-10">
      <div className="app-background-layer absolute inset-0 -z-10" />
      <div className="mx-auto max-w-md">
        <div className="glass-card rounded-[2rem] p-6 shadow-[0_24px_80px_var(--shadow)] sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--success)]">
                Email verification
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-[var(--text)]">Verify OTP</h1>
            </div>
            <Link
              href="/forgot-password"
              className="btn-ghost min-h-11 rounded-full px-4 py-2 text-sm font-medium"
            >
              Back
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
                className="w-full rounded-[1.35rem] glass-input px-4 py-4 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--success)]"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="otp" className="mb-2 block text-sm font-semibold text-[var(--text)]">
                OTP
              </label>
              <input
                id="otp"
                inputMode="numeric"
                pattern="[0-9]{6}"
                required
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                className="w-full rounded-[1.35rem] glass-input px-4 py-4 text-sm tracking-[0.35em] text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--success)]"
                placeholder="123456"
              />
            </div>

            {error ? (
              <div className="rounded-[1.25rem] alert-error px-4 py-3 text-sm">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-success min-h-13 w-full rounded-[1.35rem] px-6 py-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Verifying..." : "Verify OTP"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
