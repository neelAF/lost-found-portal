"use client";

import Link from "next/link";
import Image from "next/image";
import { Camera, Check, ChevronDown } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

import { ChatsSection } from "@/app/components/chats-section";
import { ChangePasswordSection } from "@/app/components/change-password-section";
import { ClaimRequestsSection } from "@/app/components/claim-requests-section";
import { MyItemsSection } from "@/app/components/my-items-section";

type ProfileResponse = {
  name: string;
  email: string;
  image?: string;
  createdAt: string;
};

type AvatarUploadResponse = {
  success?: boolean;
  image?: string;
  user?: ProfileResponse;
  error?: string;
};

type ProfileTab = "items" | "claims" | "finderResponses" | "chats" | "password";

const profileNavItems: Array<{ label: string; value: ProfileTab }> = [
  { label: "My Items", value: "items" },
  { label: "Ownership Claims", value: "claims" },
  { label: "Finder Responses", value: "finderResponses" },
  { label: "Chats", value: "chats" },
  { label: "Change Password", value: "password" },
];

const profileActiveTabStorageKey = "lost-found-profile-active-tab";

function getInitialProfileTab(): ProfileTab {
  if (typeof window === "undefined") {
    return "items";
  }

  const storedTab = window.sessionStorage.getItem(profileActiveTabStorageKey);
  const matchedTab = profileNavItems.find((item) => item.value === storedTab);

  return matchedTab?.value ?? "items";
}

const avatarMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const avatarFileNamePattern = /\.(jpe?g|png|webp)$/i;
const avatarUploadFolder = "lost-found-portal/avatars";
const avatarUploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ?? "";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function ProfileForm() {
  const { data: session, update } = useSession();
  const currentUser = session?.user ?? null;
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [name, setName] = useState("");
  const [activeTab, setActiveTab] = useState<ProfileTab>(getInitialProfileTab);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const mobileNavRef = useRef<HTMLDivElement | null>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const displayName = name.trim() || profile?.name || currentUser?.name || "User";
  const avatarLetter = displayName.charAt(0).toUpperCase();
  const avatarImage = avatarPreview || profile?.image || currentUser?.image || "";
  const activeNavItem = profileNavItems.find((item) => item.value === activeTab) ?? profileNavItems[0];

  useEffect(() => {
    window.sessionStorage.setItem(profileActiveTabStorageKey, activeTab);
  }, [activeTab]);

  useEffect(() => {
    return () => {
      if (avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        setError("");

        const response = await fetch("/api/user", {
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Unable to load profile.");
        }

        const data = (await response.json()) as ProfileResponse;
        setProfile(data);
        setName(data.name);
        setAvatarPreview("");
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setError("Unable to load your profile right now.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void fetchProfile();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!isMobileNavOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!mobileNavRef.current?.contains(event.target as Node)) {
        setIsMobileNavOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMobileNavOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileNavOpen]);

  async function handleUpdate(nextName?: string) {
    if (!currentUser) {
      return;
    }

    setError("");
    setSuccess("");
    setIsSaving(true);

    const resolvedName = nextName ?? name;

    const response = await fetch("/api/user", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: resolvedName }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { error?: string; user?: ProfileResponse }
      | null;

    if (!response.ok || !payload?.user) {
      setError(payload?.error ?? "Unable to update your profile right now.");
      setIsSaving(false);
      return;
    }

    setProfile(payload.user);
    setName(payload.user.name);
    setSuccess("Profile updated successfully.");
    await update({
      ...session,
      user: {
        ...currentUser,
        name: payload.user.name,
        image: payload.user.image ?? currentUser.image,
      },
    });
    setIsSaving(false);
  }

  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!currentUser || !file || isAvatarUploading) {
      return;
    }

    if (!avatarMimeTypes.includes(file.type) && !avatarFileNamePattern.test(file.name)) {
      setError("Avatar must be a JPG, PNG, or WEBP image.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Avatar image must be 5MB or smaller.");
      event.target.value = "";
      return;
    }

    if (!avatarUploadPreset) {
      setError("Cloudinary avatar upload preset is not configured.");
      event.target.value = "";
      return;
    }

    const nextPreview = URL.createObjectURL(file);
    const previousPreview = avatarPreview;

    setAvatarPreview(nextPreview);
    setError("");
    setSuccess("");
    setIsAvatarUploading(true);

    const formData = new FormData();
    formData.set("file", file);
    formData.set("upload_preset", avatarUploadPreset);
    formData.set("folder", avatarUploadFolder);

    try {
      const response = await fetch("/api/user/avatar", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json().catch(() => null)) as
        | AvatarUploadResponse
        | null;

      if (!response.ok || !payload?.user) {
        throw new Error(payload?.error ?? "Unable to upload profile avatar right now.");
      }

      const nextUser = {
        ...payload.user,
        image: payload.user.image ?? payload.image ?? "",
      };

      setProfile(nextUser);
      setName(nextUser.name);
      setAvatarPreview("");
      setSuccess("Profile avatar updated successfully.");

      await update({
        ...session,
        user: {
          ...currentUser,
          name: nextUser.name,
          email: nextUser.email,
          image: nextUser.image ?? "",
        },
      });
    } catch (error) {
      setAvatarPreview(previousPreview);
      setError((error as Error).message || "Unable to upload profile avatar right now.");
    } finally {
      if (nextPreview.startsWith("blob:")) {
        URL.revokeObjectURL(nextPreview);
      }

      setIsAvatarUploading(false);
      event.target.value = "";
    }
  }

  function handleEditClick() {
    const nextName = window.prompt("Update your display name", displayName)?.trim();

    if (!nextName || nextName === name) {
      return;
    }

    setName(nextName);
    void handleUpdate(nextName);
  }

  return (
    <main className="app-background relative min-h-screen py-8 before:absolute before:inset-0 before:content-['']">
      <div className="relative z-10 mx-auto w-full max-w-[96rem] space-y-6 px-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-[var(--text)]">Account Profile</h1>
            <p className="text-sm font-medium text-[var(--text-secondary)]">
              Manage your account, profile info, ownership claims, finder responses, chats and more.
            </p>
          </div>
          <Link
            href="/"
            className="profile-home-btn inline-flex min-h-11 items-center justify-center rounded-xl border px-4 py-2 text-sm font-semibold text-[var(--text)] transition-all duration-150 ease-out"
          >
            Home
          </Link>
        </div>

        {isLoading ? (
          <div className="panel-muted rounded-2xl px-6 py-10 text-center text-sm">
            Loading profile...
          </div>
        ) : !currentUser ? (
          <div className="panel-muted rounded-2xl px-6 py-10 text-center text-sm">
            Login to view your profile.
          </div>
        ) : (
          <div className="min-w-0 space-y-5">
              <div className="profile-content-heading hidden">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] eyebrow">
                  Account
                </p>
                <h2 className="mt-2 text-lg font-semibold text-[var(--text)]">
                  {profileNavItems.find((item) => item.value === activeTab)?.label}
                </h2>
              </div>

              <section className="profile-dashboard-header rounded-2xl p-5 sm:p-6">
                <div className="flex flex-col gap-6 md:flex-row md:items-center">
                  <div className="flex items-center gap-4">
                    <div className="relative h-16 w-16 shrink-0">
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        disabled={isAvatarUploading}
                        className="profile-avatar-button relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-[var(--accent)] text-xl font-bold text-[var(--on-accent)] shadow-lg shadow-[var(--shadow)] ring-1 ring-white/20 disabled:cursor-not-allowed disabled:opacity-70"
                        aria-label="Upload profile avatar"
                        title="Upload profile avatar"
                      >
                        {avatarImage ? (
                          <Image
                            src={avatarImage}
                            alt=""
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        ) : (
                          avatarLetter
                        )}
                        <span className="profile-avatar-edit-badge" aria-hidden="true">
                          <Camera className="h-4 w-4" strokeWidth={2.2} />
                        </span>
                      </button>
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        className="sr-only"
                        onChange={(event) => void handleAvatarChange(event)}
                      />
                    </div>
                    <div>
                      <h2 className="mt-1 text-2xl font-semibold text-[var(--text)]">{displayName}</h2>
                      <p className="text-sm text-[var(--text-muted)]">{profile?.email ?? currentUser.email}</p>
                      <p className="mt-5 text-xs text-[var(--text-muted)]">
                        Joined: {profile?.createdAt ? formatDate(profile.createdAt) : "-"}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 md:ml-auto">
                    <button
                      type="button"
                      onClick={() => handleEditClick()}
                      disabled={isSaving}
                      className="btn-primary rounded-xl px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {isSaving ? "Saving..." : "Edit"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void signOut({ callbackUrl: "/" })}
                      className="logout-btn rounded-xl border border-[var(--border)] bg-[var(--glass)] px-4 py-2 text-sm font-medium text-[var(--text)] transition-all duration-150 ease-out hover:text-[var(--on-accent)]"
                    >
                      Logout
                    </button>
                  </div>
                </div>

                {error ? (
                  <div className="mt-4 rounded-xl alert-error px-4 py-3 text-sm">
                    {error}
                  </div>
                ) : null}

                {success ? (
                  <div className="mt-4 rounded-xl alert-success px-4 py-3 text-sm">
                    {success}
                  </div>
                ) : null}
              </section>

              <section
                ref={mobileNavRef}
                className="profile-mobile-nav relative z-30 sm:hidden"
              >
                <button
                  type="button"
                  onClick={() => setIsMobileNavOpen((current) => !current)}
                  className="profile-mobile-nav-trigger flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold text-[var(--text)]"
                  aria-expanded={isMobileNavOpen}
                  aria-haspopup="menu"
                >
                  <span className="min-w-0 truncate">{activeNavItem.label}</span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 transition-transform duration-200 ease-out ${
                      isMobileNavOpen ? "rotate-180" : ""
                    }`}
                    strokeWidth={2.2}
                    aria-hidden="true"
                  />
                </button>

                <div
                  className={`profile-mobile-nav-menu absolute left-0 right-0 top-[calc(100%+0.65rem)] overflow-hidden rounded-2xl p-2 ${
                    isMobileNavOpen
                      ? "profile-mobile-nav-menu-open pointer-events-auto"
                      : "profile-mobile-nav-menu-closed pointer-events-none"
                  }`}
                  role="menu"
                >
                  {profileNavItems.map((item) => {
                    const isActive = activeTab === item.value;

                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => {
                          setActiveTab(item.value);
                          setIsMobileNavOpen(false);
                        }}
                        className={`profile-mobile-nav-item flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-3.5 py-3 text-left text-sm font-semibold ${
                          isActive
                            ? "profile-mobile-nav-item-active text-[var(--text)]"
                            : "text-[var(--text-secondary)]"
                        }`}
                        role="menuitem"
                      >
                        <span className="min-w-0 truncate">{item.label}</span>
                        {isActive ? (
                          <Check className="h-4 w-4 shrink-0" strokeWidth={2.4} aria-hidden="true" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="profile-dashboard-tabs hidden rounded-xl p-2 sm:block">
                <div className="flex flex-wrap gap-2">
                  {profileNavItems.map((item) => {
                    const isActive = activeTab === item.value;

                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setActiveTab(item.value)}
                        className={`profile-dashboard-tab rounded-lg px-5 py-2 text-sm font-semibold transition-all duration-150 ease-out ${
                          isActive
                            ? "profile-dashboard-tab-active text-[var(--text)]"
                            : "text-[var(--text-secondary)] hover:text-[var(--text)]"
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="profile-dashboard-content rounded-2xl p-4 sm:p-5">
                {activeTab === "items" ? (
                  <MyItemsSection
                    showHeader={false}
                    useDashboardGrid
                    usePremiumActionHover
                    usePremiumCardHover
                    useProfileCardStyle
                  />
                ) : activeTab === "claims" ? (
                  <ClaimRequestsSection showHeader={false} />
                ) : activeTab === "finderResponses" ? (
                  <ClaimRequestsSection showHeader={false} variant="finder-response" />
                ) : activeTab === "chats" ? (
                  <ChatsSection showHeader={false} />
                ) : (
                  <ChangePasswordSection showHeader={false} />
                )}
              </section>
            </div>
        )}
      </div>
    </main>
  );
}
