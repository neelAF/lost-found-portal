"use client";

import Image from "next/image";
import { useId } from "react";

import type { LostItem, LostItemStatus, LostItemType } from "@/lib/lost-item-shared";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getTypeBadgeClasses(type: LostItemType) {
  return type === "found" ? "badge-success" : "badge-warning";
}

function getTypeLabel(type: LostItemType) {
  return type === "found" ? "Found" : "Lost";
}

function getStatusBadgeClasses(status: LostItemStatus) {
  return status === "resolved" ? "badge-muted" : "badge-success";
}

function getStatusLabel(status: LostItemStatus) {
  return status === "resolved" ? "Resolved" : "Active";
}

function getResolveLabel(item: LostItem, isBusy: boolean) {
  if (item.status === "resolved") {
    return "Resolved";
  }

  if (isBusy) {
    return "Updating...";
  }

  return "Mark as Resolved";
}

type ItemCardProps = {
  item: LostItem;
  showContactNumber?: boolean;
  canResolve?: boolean;
  canDelete?: boolean;
  canClaim?: boolean;
  canReportFound?: boolean;
  isBusy?: boolean;
  usePremiumActionHover?: boolean;
  usePremiumCardHover?: boolean;
  useProfileCardStyle?: boolean;
  useRecentActionStyle?: boolean;
  onResolve?: (itemId: string) => void | Promise<void>;
  onDelete?: (itemId: string) => void | Promise<void>;
  onClaim?: (item: LostItem) => void;
  onReportFound?: (item: LostItem) => void;
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

function ResolvedStamp() {
  const stampId = useId().replaceAll(":", "");
  const topArcId = `${stampId}-resolved-top-arc`;
  const bottomArcId = `${stampId}-resolved-bottom-arc`;
  const distressId = `${stampId}-resolved-distress`;

  return (
    <div aria-hidden="true" className="resolved-stamp-overlay pointer-events-none">
      <svg
        className="resolved-stamp"
        viewBox="0 0 420 420"
        role="presentation"
        focusable="false"
      >
        <defs>
          <path
            id={topArcId}
            d="M 94 210 A 116 116 0 0 1 326 210"
            pathLength="100"
          />
          <path
            id={bottomArcId}
            d="M 326 210 A 116 116 0 0 1 94 210"
            pathLength="100"
          />
          <filter id={distressId} x="-12%" y="-12%" width="124%" height="124%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.78"
              numOctaves="4"
              seed="19"
              result="noise"
            />
            <feColorMatrix
              in="noise"
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.44 0"
              result="texture"
            />
            <feComposite in="SourceGraphic" in2="texture" operator="out" />
          </filter>
        </defs>

        <g className="resolved-stamp-ink" filter={`url(#${distressId})`}>
          <circle className="resolved-stamp-ring resolved-stamp-ring-outer" cx="210" cy="210" r="160" />
          <circle className="resolved-stamp-ring resolved-stamp-ring-mid" cx="210" cy="210" r="147" />
          <circle className="resolved-stamp-ring resolved-stamp-ring-inner" cx="210" cy="210" r="104" />
          <circle className="resolved-stamp-ring resolved-stamp-ring-core" cx="210" cy="210" r="84" />

          <text className="resolved-stamp-arc-text">
            <textPath href={`#${topArcId}`} startOffset="50%" textAnchor="middle">
              RESOLVED
            </textPath>
          </text>

          <text className="resolved-stamp-arc-text resolved-stamp-arc-text-bottom">
            <textPath href={`#${bottomArcId}`} startOffset="50%" textAnchor="middle">
              RESOLVED
            </textPath>
          </text>

          <g className="resolved-stamp-star-row" transform="translate(132 180)">
            <circle cx="0" cy="0" r="8" />
            <circle cx="78" cy="0" r="8" />
            <circle cx="156" cy="0" r="8" />
          </g>
          <g className="resolved-stamp-star-row resolved-stamp-star-row-bottom" transform="translate(132 300)">
            <circle cx="0" cy="0" r="7" />
            <circle cx="78" cy="0" r="7" />
            <circle cx="156" cy="0" r="7" />
          </g>

          <g className="resolved-stamp-band">
            <rect x="38" y="164" width="344" height="92" rx="12" />
            <text x="210" y="229" textAnchor="middle">RESOLVED</text>
          </g>
        </g>
      </svg>
    </div>
  );
}

export function ItemCard({
  item,
  showContactNumber = false,
  canResolve = false,
  canDelete = false,
  canClaim = false,
  canReportFound = false,
  isBusy = false,
  usePremiumActionHover = false,
  usePremiumCardHover = false,
  useProfileCardStyle = false,
  useRecentActionStyle = false,
  onResolve,
  onDelete,
  onClaim,
  onReportFound,
}: ItemCardProps) {
  const canShowClaimAction = canClaim && item.type === "found";
  const canShowFoundAction = canReportFound && item.type === "lost";
  const showActions = canResolve || canDelete || canShowClaimAction || canShowFoundAction;
  const premiumActionClass = usePremiumActionHover ? "recent-action-btn " : "";
  const profileResolvedClass = usePremiumActionHover ? "profile-resolved-btn " : "";
  const resolveColorClass = usePremiumActionHover ? "btn-success" : "btn-primary";
  const primaryActionButtonClassName = useRecentActionStyle
    ? "recent-action-btn btn-accent w-full gap-2 rounded-xl px-4 py-2.5 text-sm font-medium shadow-sm active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
    : `${premiumActionClass}btn-accent w-full gap-2 rounded-xl px-4 py-2.5 text-sm font-medium shadow-sm active:scale-95 disabled:cursor-not-allowed disabled:opacity-50`;
  const foundActionButtonClassName = useRecentActionStyle
    ? "recent-action-btn btn-success w-full gap-2 rounded-xl px-4 py-2.5 text-sm font-medium shadow-sm active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
    : `${premiumActionClass}btn-success w-full gap-2 rounded-xl px-4 py-2.5 text-sm font-medium shadow-sm active:scale-95 disabled:cursor-not-allowed disabled:opacity-50`;
  const resolveButtonClassName = useRecentActionStyle
    ? "recent-resolved-btn mark-resolved-btn recent-action-btn btn-success w-full gap-2 rounded-xl px-4 py-2.5 text-sm font-medium shadow-sm active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
    : `mark-resolved-btn ${profileResolvedClass}${premiumActionClass}${resolveColorClass} w-full gap-2 rounded-xl px-4 py-2.5 text-sm font-medium shadow-sm active:scale-95 disabled:cursor-not-allowed disabled:opacity-50`;
  const deleteButtonClassName = `${premiumActionClass}delete-item-btn ${useProfileCardStyle ? "" : "mt-2"} w-full rounded-xl btn-danger px-4 py-2.5 text-sm font-medium shadow-sm active:scale-95 disabled:cursor-not-allowed disabled:opacity-50`;
  const articleClassName = useProfileCardStyle
    ? "recent-activity-card glass-card group relative flex h-full min-h-[420px] flex-col overflow-hidden rounded-[1.75rem] p-5 shadow-sm transition-all duration-200 ease-out"
    : usePremiumCardHover || useRecentActionStyle
      ? "recent-activity-card glass-card group relative flex h-full min-h-[420px] flex-col overflow-hidden rounded-[1.75rem] p-5 shadow-sm transition-all duration-200 ease-out"
      : "glass-card group relative flex h-full min-h-[420px] flex-col overflow-hidden p-5 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl";
  const imageClassName = useProfileCardStyle
    ? "h-40 w-full rounded-lg object-cover"
    : "h-40 w-full rounded-lg object-cover";
  const metaCardClassName = useProfileCardStyle
    ? "glass rounded-xl px-4 py-3"
    : "glass rounded-xl px-4 py-3";

  return (
    <article className={articleClassName}>
      {item.status === "resolved" ? <ResolvedStamp /> : null}
      <div className="relative z-10 flex h-full flex-col">
        <div className="flex-1 space-y-3">
          {item.image ? (
            <div className="glass overflow-hidden rounded-xl">
              <Image
                src={item.image}
                alt={item.title}
                width={800}
                height={320}
                className={imageClassName}
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
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              {formatDate(item.createdAt)}
            </span>
          </div>

          <h2 className="text-lg font-semibold text-[var(--text)]">
            {item.title}
          </h2>
          <p className="text-sm leading-7 text-[var(--text-secondary)]">
            {item.description}
          </p>

          <div className="space-y-3 pt-1">
            <div className={metaCardClassName}>
              <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">
                Location
              </p>
              <p className="mt-1 text-sm font-semibold text-[var(--text)]">
                {item.location}
              </p>
            </div>

            {showContactNumber && item.contactNumber ? (
              <div className={metaCardClassName}>
                <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">
                  Contact Number
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--text)]">
                  {item.contactNumber}
                </p>
              </div>
            ) : null}
          </div>
        </div>

        {showActions ? (
          <div className="mt-auto pt-4">
            <div
              className={
                useProfileCardStyle
                  ? "mt-4 flex flex-col gap-3 border-t border-[var(--border)] pt-4 sm:flex-row"
                  : "mt-4 flex gap-3 border-t border-[var(--border)] pt-4"
              }
            >
              {canShowClaimAction ? (
                <button
                  type="button"
                  disabled={item.status === "resolved" || isBusy}
                  onClick={() => onClaim?.(item)}
                  className={primaryActionButtonClassName}
                >
                  Claim Item
                </button>
              ) : null}

              {canShowFoundAction ? (
                <button
                  type="button"
                  disabled={item.status === "resolved" || isBusy}
                  onClick={() => onReportFound?.(item)}
                  className={foundActionButtonClassName}
                >
                  I Found This
                </button>
              ) : null}

              {canResolve ? (
                <button
                  type="button"
                  disabled={item.status === "resolved" || isBusy}
                  onClick={() => void onResolve?.(item.id)}
                  className={resolveButtonClassName}
                >
                  <CheckCircleIcon />
                  {getResolveLabel(item, isBusy)}
                </button>
              ) : null}

              {canDelete && useProfileCardStyle ? (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void onDelete?.(item.id)}
                  className={deleteButtonClassName}
                >
                  {isBusy ? "Working..." : "Delete Item"}
                </button>
              ) : null}
            </div>

            {canDelete && !useProfileCardStyle ? (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => void onDelete?.(item.id)}
                className={deleteButtonClassName}
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
