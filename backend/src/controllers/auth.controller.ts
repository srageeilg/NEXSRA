import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { setRefreshTokenCookie, clearRefreshTokenCookie, getRefreshTokenCookie } from "../utils/cookies";
import * as authService from "../services/auth.service";

export const registerBusiness = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.registerBusiness(req.body);
  res.status(201).json({
    success: true,
    message: "Business registered. Please check your email to verify your account.",
    data: result,
  });
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  await authService.verifyEmail(req.query.token as string);
  res.json({ success: true, message: "Email verified successfully" });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login({
    ...req.body,
    userAgent: req.headers["user-agent"],
    ipAddress: req.ip,
  });

  if (result.requiresTwoFactor) {
    return res.json({ success: true, requiresTwoFactor: true, data: { userId: result.userId } });
  }

  setRefreshTokenCookie(res, result.refreshToken);
  res.json({
    success: true,
    message: "Login successful",
    data: { accessToken: result.accessToken, user: result.user },
  });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = getRefreshTokenCookie(req.cookies);
  if (!refreshToken) throw ApiError.unauthorized("No refresh token provided");

  const result = await authService.refreshSession(refreshToken, req.headers["user-agent"], req.ip);
  setRefreshTokenCookie(res, result.refreshToken);
  res.json({ success: true, data: { accessToken: result.accessToken, user: result.user } });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = getRefreshTokenCookie(req.cookies);
  if (refreshToken) await authService.logout(refreshToken);
  clearRefreshTokenCookie(res);
  res.json({ success: true, message: "Logged out successfully" });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.forgotPassword(req.body.email);
  res.json({ success: true, message: "If an account exists for this email, a reset link has been sent." });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.resetPassword(req.body.token, req.body.password);
  res.json({ success: true, message: "Password reset successfully. Please log in." });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.changePassword(req.user!.sub, req.body.currentPassword, req.body.newPassword);
  res.json({ success: true, message: "Password changed successfully" });
});

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await authService.getProfile(req.user!.sub);
  res.json({ success: true, data: profile });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const profile = await authService.updateProfile(req.user!.sub, req.body);
  res.json({ success: true, data: profile });
});

export const setupTwoFactor = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.generateTwoFactorSecret(req.user!.sub);
  res.json({ success: true, data: result });
});

export const enableTwoFactor = asyncHandler(async (req: Request, res: Response) => {
  await authService.enableTwoFactor(req.user!.sub, req.body.code);
  res.json({ success: true, message: "Two-factor authentication enabled" });
});

export const disableTwoFactor = asyncHandler(async (req: Request, res: Response) => {
  await authService.disableTwoFactor(req.user!.sub);
  res.json({ success: true, message: "Two-factor authentication disabled" });
});

export const listSessions = asyncHandler(async (req: Request, res: Response) => {
  const sessions = await authService.listSessions(req.user!.sub);
  res.json({ success: true, data: sessions });
});

export const revokeSession = asyncHandler(async (req: Request, res: Response) => {
  await authService.revokeSession(req.user!.sub, req.params.sessionId);
  res.json({ success: true, message: "Session revoked" });
});
