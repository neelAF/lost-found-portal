"use client";

import Link from "next/link";
import { ChangePasswordSection } from "@/app/components/change-password-section";

export function ChangePasswordForm() {
  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-8 sm:px-8 lg:px-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.2),_transparent_26%),linear-gradient(180deg,_#f7fbff,_#edf7ff_55%,_#f8fafc)]" />
      <div className="mx-auto max-w-md">
        <div className="rounded-[2rem] border border-white/35 bg-white/60 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:bg-white/10 sm:p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700">
                Account security
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-[var(--text)]">Change Password</h1>
            </div>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white/60 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white/60 dark:bg-white/10 dark:text-slate-200"
            >
              Home
            </Link>
          </div>
          <ChangePasswordSection />
        </div>
      </div>
    </main>
  );
}
