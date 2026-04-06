"use client";

import { MyItemsSection } from "@/app/components/my-items-section";

export function MyItemsDashboard() {
  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-8 sm:px-8 lg:px-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(236,72,153,0.18),_transparent_26%),linear-gradient(180deg,_#f7fbff,_#edf7ff_55%,_#f8fafc)]" />
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[2rem] border border-white/35 bg-white/60 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:bg-white/10 sm:p-8">
          <MyItemsSection />
        </div>
      </div>
    </main>
  );
}
