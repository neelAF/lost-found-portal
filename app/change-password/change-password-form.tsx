"use client";

import Link from "next/link";
import { ChangePasswordSection } from "@/app/components/change-password-section";

export function ChangePasswordForm() {
  return (
    <main className="relative min-h-screen overflow-x-hidden px-5 py-8 sm:px-8 lg:px-10">
      <div className="app-background-layer absolute inset-0 -z-10" />
      <div className="mx-auto max-w-md">
        <div className="glass-card rounded-[2rem] p-6 shadow-[0_24px_80px_var(--shadow)] sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] eyebrow">
                Account security
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-[var(--text)]">Change Password</h1>
            </div>
            <Link
              href="/"
              className="btn-ghost min-h-11 rounded-full px-4 py-2 text-sm font-medium"
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
