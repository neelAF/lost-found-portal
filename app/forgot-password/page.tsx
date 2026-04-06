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
    <main className="relative min-h-screen overflow-hidden px-5 py-8 sm:px-8 lg:px-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.22),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.15),_transparent_26%),linear-gradient(180deg,_#f8fbff,_#eef6ff_55%,_#f7fafc)]" />
      <div className="mx-auto max-w-md">
        <div className="rounded-[2rem] border border-white/35 bg-white/60 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:bg-white/10 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700">
                Password help
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-[var(--text)]">Forgot Password</h1>
            </div>
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white/60 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white/60 dark:bg-white/10 dark:text-slate-200"
            >
              Login
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
                className="w-full rounded-[1.35rem] border border-white/45 bg-white/60 px-4 py-4 text-sm text-[var(--text)] shadow-inner shadow-white/60 outline-none placeholder:text-slate-400 focus:border-sky-300 dark:bg-white/10 dark:text-slate-100 dark:placeholder:text-slate-400"
                placeholder="you@example.com"
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
              disabled={isSubmitting}
              className="inline-flex min-h-13 w-full items-center justify-center rounded-[1.35rem] bg-sky-600 px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:bg-sky-700 hover:shadow-sky-500/35 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? "Sending OTP..." : "Send OTP"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
