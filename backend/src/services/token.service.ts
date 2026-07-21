import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env";
import { SystemRole } from "@prisma/client";

export interface AccessTokenPayload {
  sub: string; // userId
  businessId: string | null;
  role: SystemRole;
  roleAssignmentId: string | null;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const options: jwt.SignOptions = { expiresIn: env.jwt.accessExpiresIn as jwt.SignOptions["expiresIn"] };
  return jwt.sign(payload, env.jwt.accessSecret, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwt.accessSecret) as AccessTokenPayload;
}

export function generateRefreshTokenValue(): string {
  return crypto.randomBytes(48).toString("hex");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateRandomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("hex");
}

export function refreshTokenExpiryDate(): Date {
  const days = parseInt(env.jwt.refreshExpiresIn) || 7;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
