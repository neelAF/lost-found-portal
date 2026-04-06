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
    <main className="relative min-h-screen overflow-hidden px-5 py-8 sm:px-8 lg:px-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,_rgba(34,197,94,0.18),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(59,130,246,0.16),_transparent_26%),linear-gradient(180deg,_#f6fffb,_#effcf6_55%,_#f8fafc)]" />
      <div className="mx-auto max-w-md">
        <div className="rounded-[2rem] border border-white/35 bg-white/60 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:bg-white/10 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-700">
                Email verification
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-[var(--text)]">Verify OTP</h1>
            </div>
            <Link
              href="/forgot-password"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white/60 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white/60 dark:bg-white/10 dark:text-slate-200"
            >
              Back
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-[1.35rem] border border-white/45 bg-white/60 px-4 py-4 text-sm text-[var(--text)] shadow-inner shadow-white/60 outline-none placeholder:text-slate-400 focus:border-emerald-300 dark:bg-white/10 dark:text-slate-100 dark:placeholder:text-slate-400"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="otp" className="mb-2 block text-sm font-semibold text-slate-700">
                OTP
              </label>
              <input
                id="otp"
                inputMode="numeric"
                pattern="[0-9]{6}"
                required
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                className="w-full rounded-[1.35rem] border border-white/45 bg-white/60 px-4 py-4 text-sm tracking-[0.35em] text-[var(--text)] shadow-inner shadow-white/60 outline-none placeholder:text-slate-400 focus:border-emerald-300 dark:bg-white/10 dark:text-slate-100 dark:placeholder:text-slate-400"
                placeholder="123456"
              />
            </div>

            {error ? (
              <div className="rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex min-h-13 w-full items-center justify-center rounded-[1.35rem] bg-emerald-600 px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-700 hover:shadow-emerald-500/35 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Verifying..." : "Verify OTP"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
