"use client";

import { MyItemsSection } from "@/app/components/my-items-section";

export function MyItemsDashboard() {
  return (
    <main className="relative min-h-screen overflow-x-hidden px-5 py-8 sm:px-8 lg:px-10">
      <div className="app-background-layer absolute inset-0 -z-10" />
      <div className="mx-auto max-w-7xl">
        <div className="glass-card rounded-[2rem] p-6 shadow-[0_24px_80px_var(--shadow)] sm:p-8">
          <MyItemsSection />
        </div>
      </div>
    </main>
  );
}
