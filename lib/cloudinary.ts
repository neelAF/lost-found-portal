import { v2 as cloudinary } from "cloudinary";

let isConfigured = false;

function configureCloudinary() {
  if (isConfigured) {
    return;
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const cloudinaryUrl = process.env.CLOUDINARY_URL;

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

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  isConfigured = true;
}

export async function uploadImageToCloudinary(file: File) {
  configureCloudinary();

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  return new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "lost-found-portal",
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
