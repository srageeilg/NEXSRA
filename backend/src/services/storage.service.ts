import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { env } from "../config/env";
import { publicUploadUrl } from "../middleware/upload";

if (env.storage.driver === "cloudinary") {
  cloudinary.config({
    cloud_name: env.storage.cloudinary.cloudName,
    api_key: env.storage.cloudinary.apiKey,
    api_secret: env.storage.cloudinary.apiSecret,
  });
}

/**
 * Given a multer-saved local file, returns the final public URL — uploading to
 * Cloudinary and removing the local temp file when STORAGE_DRIVER=cloudinary,
 * or returning the local static path otherwise.
 */
export async function resolveUploadedFileUrl(file: Express.Multer.File): Promise<string> {
  if (env.storage.driver === "cloudinary") {
    const result = await cloudinary.uploader.upload(file.path, { folder: "nexsra" });
    fs.unlink(file.path, () => {});
    return result.secure_url;
  }
  return publicUploadUrl(file.filename);
}
