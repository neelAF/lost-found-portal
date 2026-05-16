"use client";

type ReportSuccessConfirmationProps = {
  itemTitle: string;
  sentAt: string;
  type: "lost" | "found";
};

function formatConfirmationTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function ReportSuccessConfirmation({
  itemTitle,
  sentAt,
  type,
}: ReportSuccessConfirmationProps) {
  return (
    <div
      className="success-confirmation-backdrop fixed inset-0 z-40 flex items-center justify-center px-5"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="success-confirmation-card w-full max-w-md rounded-[2rem] p-7 text-center sm:p-8">
        <div className="success-orbit mx-auto flex h-24 w-24 items-center justify-center rounded-full">
          <div className="success-check-wrap flex h-16 w-16 items-center justify-center rounded-full">
            <svg aria-hidden="true" viewBox="0 0 52 52" className="success-check-icon h-12 w-12">
              <circle className="success-check-circle" cx="26" cy="26" r="23" />
              <path className="success-check-path" d="M15 27.5 22.5 35 38 18.5" />
            </svg>
          </div>
        </div>

        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.28em] eyebrow">
          Report submitted
        </p>
        <h3 className="mt-2 text-2xl font-semibold text-[var(--text)]">
          {type === "found" ? "Found Item Report Submitted" : "Lost Item Report Submitted"}
        </h3>
        <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
          {type === "found"
            ? "Owners can now review and claim this item from the portal."
            : "Your missing item is now visible so people can respond if they find it."}
        </p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--success)]">
          Submitted {formatConfirmationTime(sentAt)}
        </p>
        <p className="mt-4 truncate rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)]">
          {itemTitle}
        </p>
      </div>
    </div>
  );
}
