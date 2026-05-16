import { v2 as cloudinary } from "cloudinary";

let isConfigured = false;
const itemImageFolder = "lost-found-portal";

type CloudinaryUnsignedUploadResponse = {
  secure_url?: string;
  error?: {
    message?: string;
  };
};

function configureCloudinary() {
  if (isConfigured) {
    return;
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  const cloudinaryUrl = process.env.CLOUDINARY_URL?.trim();

  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    isConfigured = true;
    return;
  }

  if (cloudinaryUrl) {
    cloudinary.config({ secure: true });
    isConfigured = true;
    return;
  }

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary is not configured. Please set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.",
    );
  }
}

async function uploadImageWithPreset(file: File) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim();

  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary upload preset is not configured.");
  }

  const formData = new FormData();
  formData.set("file", file);
  formData.set("upload_preset", uploadPreset);
  formData.set("folder", itemImageFolder);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });
  const payload = (await response.json().catch(() => null)) as
    | CloudinaryUnsignedUploadResponse
    | null;

  if (!response.ok || !payload?.secure_url) {
    throw new Error(payload?.error?.message ?? "Cloudinary upload failed.");
  }

  return payload.secure_url;
}

async function uploadImageWithSignedStream(file: File) {
  configureCloudinary();

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  return new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: itemImageFolder,
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          console.error("[cloudinary-upload] Upload failed:", error);
          reject(new Error(error.message || "Cloudinary upload failed."));
          return;
        }

        if (!result?.secure_url) {
          console.error("[cloudinary-upload] Missing secure_url in upload result:", result);
          reject(new Error("Cloudinary upload did not return an image URL."));
          return;
        }

        resolve(result.secure_url);
      },
    );

    stream.on("error", (error) => {
      console.error("[cloudinary-upload] Upload stream failed:", error);
      reject(error);
    });

    stream.end(buffer);
  });
}

export async function uploadImageToCloudinary(file: File) {
  try {
    return await uploadImageWithSignedStream(file);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (!message.toLowerCase().includes("invalid signature")) {
      throw error;
    }

    console.warn("[cloudinary-upload] Signed upload failed, retrying with upload preset.");
    return uploadImageWithPreset(file);
  }
}
