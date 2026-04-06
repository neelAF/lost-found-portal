"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

const initialForm = {
  type: "lost" as const,
  title: "",
  description: "",
  location: "",
  contactNumber: "",
};

export function ReportLostForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState(initialForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const payload = new FormData();
    payload.set("type", formData.type);
    payload.set("title", formData.title);
    payload.set("description", formData.description);
    payload.set("location", formData.location);
    payload.set("contactNumber", formData.contactNumber);

    if (imageFile) {
      payload.set("image", imageFile);
    }

    const response = await fetch("/api/lost", {
      method: "POST",
      body: payload,
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Unable to submit your report right now.");
      return;
    }

    setFormData(initialForm);
    setImageFile(null);
    startTransition(() => {
      router.push("/");
      router.refresh();
    });
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-8 sm:px-8 lg:px-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.32),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(244,114,182,0.26),_transparent_28%),linear-gradient(180deg,_#f8fbff,_#eef6ff_55%,_#f7fafc)]" />
      <div className="mx-auto max-w-3xl">
        <div className="rounded-[2rem] border border-white/35 bg-white/60 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-2xl dark:bg-white/10 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sky-700">
                Lost item form
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-[var(--text)] sm:text-4xl">
                Report a missing belonging
              </h1>
            </div>
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white/60 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white/60 dark:bg-white/10 dark:text-slate-200"
            >
              Back to home
            </Link>
          </div>

          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
            Share the key details and we&apos;ll publish the report on the portal immediately so
            others on campus can help.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="title" className="mb-2 block text-sm font-semibold text-slate-700">
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
                className="w-full rounded-[1.35rem] border border-white/45 bg-white/60 px-4 py-4 text-sm text-[var(--text)] shadow-inner shadow-white/60 outline-none placeholder:text-slate-400 focus:border-sky-300 dark:bg-white/10 dark:text-slate-100 dark:placeholder:text-slate-400"
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="mb-2 block text-sm font-semibold text-slate-700"
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
                className="w-full rounded-[1.35rem] border border-white/45 bg-white/60 px-4 py-4 text-sm text-[var(--text)] shadow-inner shadow-white/60 outline-none placeholder:text-slate-400 focus:border-sky-300 dark:bg-white/10 dark:text-slate-100 dark:placeholder:text-slate-400"
              />
            </div>

            <div>
              <label htmlFor="location" className="mb-2 block text-sm font-semibold text-slate-700">
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
                className="w-full rounded-[1.35rem] border border-white/45 bg-white/60 px-4 py-4 text-sm text-[var(--text)] shadow-inner shadow-white/60 outline-none placeholder:text-slate-400 focus:border-sky-300 dark:bg-white/10 dark:text-slate-100 dark:placeholder:text-slate-400"
              />
            </div>

            <div>
              <label
                htmlFor="contactNumber"
                className="mb-2 block text-sm font-semibold text-slate-700"
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
                className="w-full rounded-[1.35rem] border border-white/45 bg-white/60 px-4 py-4 text-sm text-[var(--text)] shadow-inner shadow-white/60 outline-none placeholder:text-slate-400 focus:border-sky-300 dark:bg-white/10 dark:text-slate-100 dark:placeholder:text-slate-400"
              />
            </div>

            <div>
              <label htmlFor="image" className="mb-2 block text-sm font-semibold text-slate-700">
                Item image
              </label>
              <input
                id="image"
                type="file"
                accept="image/*"
                onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
                className="w-full rounded-[1.35rem] border border-white/45 bg-white/60 px-4 py-3 text-sm text-slate-700 shadow-inner shadow-white/60 outline-none file:mr-4 file:rounded-full file:border-0 file:bg-sky-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-sky-700 dark:bg-white/10 dark:text-slate-200"
              />
            </div>

            {error ? (
              <div className="rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setFormData(initialForm);
                  setImageFile(null);
                  setError("");
                }}
                className="inline-flex min-h-13 items-center justify-center rounded-[1.35rem] bg-rose-600 px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-rose-500/20 transition hover:bg-rose-700 hover:shadow-rose-500/30"
              >
                Clear form
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex min-h-13 flex-1 items-center justify-center rounded-[1.35rem] bg-indigo-600 px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:bg-indigo-700 hover:shadow-indigo-500/35 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPending ? "Submitting..." : "Submit lost item report"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
