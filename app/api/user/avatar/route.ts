import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import { UserModel } from "@/models/User";

const avatarMimeTypes = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const avatarFileNamePattern = /\.(jpe?g|png|webp)$/i;
const maxAvatarSize = 5 * 1024 * 1024;
const avatarFolder = "lost-found-portal/avatars";

export const dynamic = "force-dynamic";

function isAllowedAvatarFile(file: File) {
  return avatarMimeTypes.has(file.type) || avatarFileNamePattern.test(file.name);
}

type CloudinaryUnsignedResponse = {
  secure_url?: string;
  error?: {
    message?: string;
  };
};

async function uploadAvatarToCloudinary(file: File, uploadPreset: string, folder: string) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

  if (!cloudName) {
    throw new Error("Cloudinary cloud name is not configured.");
  }

  if (!uploadPreset) {
    throw new Error("Cloudinary avatar upload preset is not configured.");
  }

  const cloudinaryFormData = new FormData();
  cloudinaryFormData.set("file", file);
  cloudinaryFormData.set("upload_preset", uploadPreset);
  cloudinaryFormData.set("folder", folder);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: cloudinaryFormData,
  });

  const payload = (await response.json().catch(() => null)) as CloudinaryUnsignedResponse | null;

  if (!response.ok || !payload?.secure_url) {
    const message = payload?.error?.message ?? "Cloudinary avatar upload failed.";
    throw new Error(message);
  }

  return payload.secure_url;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
    }

    const formData = await request.formData();
    const avatarFile = formData.get("file");
    const uploadPreset =
      formData.get("upload_preset")?.toString() ??
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET ??
      "";
    const folder = formData.get("folder")?.toString() ?? avatarFolder;

    if (!(avatarFile instanceof File) || avatarFile.size <= 0) {
      return NextResponse.json(
        { success: false, error: "Avatar image is required." },
        { status: 400 },
      );
    }

    if (!isAllowedAvatarFile(avatarFile)) {
      return NextResponse.json(
        { success: false, error: "Avatar must be a JPG, PNG, or WEBP image." },
        { status: 400 },
      );
    }

    if (avatarFile.size > maxAvatarSize) {
      return NextResponse.json(
        { success: false, error: "Avatar image must be 5MB or smaller." },
        { status: 400 },
      );
    }

    if (uploadPreset !== process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET) {
      return NextResponse.json(
        { success: false, error: "Invalid avatar upload preset." },
        { status: 400 },
      );
    }

    if (folder !== avatarFolder) {
      return NextResponse.json(
        { success: false, error: "Invalid avatar upload folder." },
        { status: 400 },
      );
    }

    const image = await uploadAvatarToCloudinary(avatarFile, uploadPreset, folder);

    await connectToDatabase();

    const user = await UserModel.findOneAndUpdate(
      { email: session.user.email.toLowerCase() },
      { $set: { image } },
      { new: true, runValidators: true },
    ).lean();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      image,
      user: {
        name: user.name,
        email: user.email,
        image: user.image ?? image,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to upload profile avatar right now.";
    const status = message.includes("configured") ? 503 : 500;

    console.error("[profile-avatar-upload] Upload failed:", error);

    return NextResponse.json({ success: false, error: message }, { status });
  }
}
