import { Response } from "express";
import { env } from "../config/env";

const REFRESH_COOKIE_NAME = "refreshToken";
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export function setRefreshTokenCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.isProd,
    // In production the frontend (Vercel) and backend (Render) are on different domains,
    // so we need SameSite=None + Secure to allow cross-origin cookie sending.
    sameSite: env.isProd ? "none" : "strict",
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    path: "/",
  });
}

export function clearRefreshTokenCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    path: "/",
    secure: env.isProd,
    sameSite: env.isProd ? "none" : "strict",
  });
}

export function getRefreshTokenCookie(cookies: Record<string, string>): string | undefined {
  return cookies?.[REFRESH_COOKIE_NAME];
}
