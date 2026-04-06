"use client";

import Image from "next/image";

import type { LostItem, LostItemStatus, LostItemType } from "@/lib/lost-item-shared";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getTypeBadgeClasses(type: LostItemType) {
  return type === "found"
    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
    : "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300";
}

function getTypeLabel(type: LostItemType) {
  return type === "found" ? "Found" : "Lost";
}

function getStatusBadgeClasses(status: LostItemStatus) {
  return status === "resolved"
    ? "bg-slate-100 text-slate-700 dark:bg-slate-400/15 dark:text-slate-300"
    : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300";
}

function getStatusLabel(status: LostItemStatus) {
  return status === "resolved" ? "Resolved" : "Active";
}

function getResolveLabel(item: LostItem, isBusy: boolean) {
  if (item.status === "resolved") {
    return "✓ Resolved";
  }

  if (isBusy) {
    return "Updating...";
  }

  return "✓ Mark as Resolved";
}

type ItemCardProps = {
  item: LostItem;
  showContactNumber?: boolean;
  canResolve?: boolean;
  canDelete?: boolean;
  canClaim?: boolean;
  isBusy?: boolean;
  onResolve?: (itemId: string) => void | Promise<void>;
  onDelete?: (itemId: string) => void | Promise<void>;
  onClaim?: (item: LostItem) => void;
};

function CheckCircleIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[18px] w-[18px]"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function ItemCard({
  item,
  showContactNumber = false,
  canResolve = false,
  canDelete = false,
  canClaim = false,
  isBusy = false,
  onResolve,
  onDelete,
  onClaim,
}: ItemCardProps) {
  const showActions = canResolve || canDelete || canClaim;

  return (
    <article
      className="group flex h-full min-h-[420px] flex-col rounded-2xl border border-slate-200/80 bg-white/60 p-5 shadow-sm backdrop-blur-md transition-all duration-300 ease-out hover:-translate-y-1 hover:scale-[1.02] hover:border-slate-300 hover:shadow-xl hover:backdrop-blur-none dark:border-white/10 dark:bg-white/10 dark:hover:border-white/20 dark:hover:shadow-xl"
    >
      <div className="flex h-full flex-col">
        <div className="flex-1 space-y-3">
          {item.image ? (
            <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white/60 dark:border-white/10 dark:bg-white/10">
              <Image
                src={item.image}
                alt={item.title}
                width={800}
                height={320}
                className="h-40 w-full rounded-lg object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getTypeBadgeClasses(item.type)}`}
              >
                {getTypeLabel(item.type)}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${getStatusBadgeClasses(item.status)}`}
              >
                {getStatusLabel(item.status)}
              </span>
            </div>
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
              {formatDate(item.createdAt)}
            </span>
          </div>

          <h2 className="text-lg font-semibold text-[var(--text)] [filter:none] [backdrop-filter:none] dark:text-white">
            {item.title}
          </h2>
          <p className="text-sm leading-7 text-slate-600 [filter:none] [backdrop-filter:none] dark:text-gray-300">
            {item.description}
          </p>

          <div className="space-y-3 pt-1">
            <div className="rounded-xl border border-slate-200/80 bg-white/60 px-4 py-3 dark:border-white/10 dark:bg-white/10">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-500">
                Location
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--text)] [filter:none] [backdrop-filter:none] dark:text-white">
                {item.location}
              </p>
            </div>

            {showContactNumber && item.contactNumber ? (
              <div className="rounded-xl border border-slate-200/80 bg-white/60 px-4 py-3 dark:border-white/10 dark:bg-white/10">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-500">
                  Contact Number
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--text)] [filter:none] [backdrop-filter:none] dark:text-white">
                  {item.contactNumber}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {showActions ? (
          <div className="mt-auto pt-4">
            <div className="mt-4 flex gap-3 border-t border-[var(--border)] pt-4">
              {canClaim ? (
                <button
                  type="button"
                  disabled={item.status === "resolved" || isBusy}
                  onClick={() => onClaim?.(item)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:scale-105 hover:shadow-sm active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Claim Item
                </button>
              ) : null}

              {canResolve ? (
                <button
                  type="button"
                  disabled={item.status === "resolved" || isBusy}
                  onClick={() => void onResolve?.(item.id)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:scale-105 hover:bg-slate-700 active:scale-95 dark:bg-slate-900 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCircleIcon />
                  {getResolveLabel(item, isBusy)}
                </button>
              ) : null}
            </div>

            {canDelete ? (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => void onDelete?.(item.id)}
                className="mt-2 w-full rounded-xl border border-red-400 px-4 py-2 text-sm font-medium text-red-500 shadow-sm transition-all duration-200 hover:scale-105 hover:bg-red-500 hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isBusy ? "Working..." : "Delete Item"}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
