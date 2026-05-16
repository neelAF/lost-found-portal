"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState, useTransition } from "react";

import { ReportSuccessConfirmation } from "@/app/components/report-success-confirmation";
import type { LostItem } from "@/lib/lost-item-shared";

const initialForm = {
  type: "lost" as const,
  title: "",
  description: "",
  location: "",
  contactNumber: "",
};

type ReportConfirmation = {
  itemTitle: string;
  sentAt: string;
};

export function ReportLostForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState(initialForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [successConfirmation, setSuccessConfirmation] = useState<ReportConfirmation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!successConfirmation) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      startTransition(() => {
        router.push("/");
        router.refresh();
      });
    }, 2600);

    return () => window.clearTimeout(timeoutId);
  }, [router, startTransition, successConfirmation]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting || isPending) {
      return;
    }

    setError("");
    setSuccessConfirmation(null);
    setIsSubmitting(true);

    const payload = new FormData();
    payload.set("type", formData.type);
    payload.set("title", formData.title);
    payload.set("description", formData.description);
    payload.set("location", formData.location);
    payload.set("contactNumber", formData.contactNumber);

    if (imageFile) {
      payload.set("image", imageFile);
    }

    try {
      const response = await fetch("/api/lost", {
        method: "POST",
        body: payload,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(payload?.error ?? "Unable to submit your report right now.");
        return;
      }

      const data = (await response.json().catch(() => null)) as { item?: LostItem } | null;

      setFormData(initialForm);
      setImageFile(null);
      setSuccessConfirmation({
        itemTitle: data?.item?.title ?? formData.title,
        sentAt: data?.item?.createdAt ?? new Date().toISOString(),
      });
    } catch {
      setError("Unable to submit your report right now.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden px-5 py-8 sm:px-8 lg:px-10">
      <div className="app-background-layer absolute inset-0 -z-10" />
      <div className="mx-auto max-w-3xl">
        <div className="glass-card rounded-[2rem] p-6 shadow-[0_24px_80px_var(--shadow)] sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] eyebrow">
                Lost item form
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-[var(--text)] sm:text-4xl">
                Report a missing belonging
              </h1>
            </div>
            <Link
              href="/"
              className="form-back-home-btn btn-ghost min-h-11 rounded-full px-5 py-2.5 text-sm font-medium"
            >
              Back to home
            </Link>
          </div>

          <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--text-secondary)]">
            Share the key details and we&apos;ll publish the report on the portal immediately so
            others on campus can help.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="title" className="mb-2 block text-sm font-semibold text-[var(--text)]">
                Item title
              </label>
              <input
                id="title"
                required
                value={formData.title}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="Example: Blue backpack"
                className="w-full rounded-[1.35rem] glass-input px-4 py-4 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--primary)]"
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="mb-2 block text-sm font-semibold text-[var(--text)]"
              >
                Description
              </label>
              <textarea
                id="description"
                required
                rows={5}
                value={formData.description}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Include color, brand, contents, or the time it went missing."
                className="w-full rounded-[1.35rem] glass-input px-4 py-4 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--primary)]"
              />
            </div>

            <div>
              <label htmlFor="location" className="mb-2 block text-sm font-semibold text-[var(--text)]">
                Last seen location
              </label>
              <input
                id="location"
                required
                value={formData.location}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, location: event.target.value }))
                }
                placeholder="Example: Main auditorium"
                className="w-full rounded-[1.35rem] glass-input px-4 py-4 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--primary)]"
              />
            </div>

            <div>
              <label
                htmlFor="contactNumber"
                className="mb-2 block text-sm font-semibold text-[var(--text)]"
              >
                Contact Number
              </label>
              <input
                id="contactNumber"
                required
                value={formData.contactNumber}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    contactNumber: event.target.value,
                  }))
                }
                placeholder="Example: +91 98765 43210"
                className="w-full rounded-[1.35rem] glass-input px-4 py-4 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--primary)]"
              />
            </div>

            <div>
              <label htmlFor="image" className="mb-2 block text-sm font-semibold text-[var(--text)]">
                Item image
              </label>
              <input
                id="image"
                type="file"
                accept="image/*"
                onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
                className="w-full rounded-[1.35rem] glass-input px-4 py-3 text-sm text-[var(--text)] outline-none file:mr-4 file:rounded-full file:border-0 file:bg-[var(--surface-strong)] file:px-4 file:py-2 file:text-sm file:font-semibold file:text-[var(--primary)] "
              />
            </div>

            {error ? (
              <div className="rounded-[1.25rem] alert-error px-4 py-3 text-sm">
                {error}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                disabled={isSubmitting || isPending}
                onClick={() => {
                  setFormData(initialForm);
                  setImageFile(null);
                  setError("");
                  setSuccessConfirmation(null);
                }}
                className="form-clear-btn recent-action-btn delete-item-btn btn-danger min-h-13 rounded-[1.35rem] px-6 py-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
              >
                Clear form
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isPending}
                className="form-submit-btn form-submit-lost-btn btn-primary min-h-13 flex-1 rounded-[1.35rem] px-6 py-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting || isPending ? "Submitting..." : "Submit lost item report"}
              </button>
            </div>
          </form>
        </div>
      </div>
      {successConfirmation ? (
        <ReportSuccessConfirmation
          type="lost"
          itemTitle={successConfirmation.itemTitle}
          sentAt={successConfirmation.sentAt}
        />
      ) : null}
    </main>
  );
}
