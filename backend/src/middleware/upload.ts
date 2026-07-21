import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { env } from "../config/env";

if (!fs.existsSync(env.storage.uploadDir)) {
  fs.mkdirSync(env.storage.uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, env.storage.uploadDir),
  filename: (_req, file, cb) => {
    const unique = crypto.randomBytes(8).toString("hex");
    cb(null, `${Date.now()}-${unique}${path.extname(file.originalname)}`);
  },
});

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export const upload = multer({
  storage,
  limits: { fileSize: env.storage.maxUploadSizeMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error("Only JPEG, PNG, WEBP and GIF images are allowed"));
    }
    cb(null, true);
  },
});

/** Public URL for a locally-stored upload. Swap for Cloudinary secure_url when STORAGE_DRIVER=cloudinary. */
export function publicUploadUrl(filename: string): string {
  return `/uploads/${filename}`;
}
