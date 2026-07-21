import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as settingsService from "../services/settings.service";

export const getBusinessProfile = asyncHandler(async (req: Request, res: Response) => {
  const business = await settingsService.getBusinessProfile(req.user!.businessId!);
  res.json({ success: true, data: business });
});

export const updateBusinessProfile = asyncHandler(async (req: Request, res: Response) => {
  const business = await settingsService.updateBusinessProfile(req.user!.businessId!, req.body);
  res.json({ success: true, data: business });
});

export const getSettings = asyncHandler(async (req: Request, res: Response) => {
  const settings = await settingsService.getSettings(req.user!.businessId!);
  res.json({ success: true, data: settings });
});

export const upsertSetting = asyncHandler(async (req: Request, res: Response) => {
  const setting = await settingsService.upsertSetting(req.user!.businessId!, req.body.key, req.body.value);
  res.json({ success: true, data: setting });
});

export const listRoleDefinitions = asyncHandler(async (req: Request, res: Response) => {
  const roles = await settingsService.listRoleDefinitions(req.user!.businessId!);
  res.json({ success: true, data: roles });
});

export const updateRolePermissions = asyncHandler(async (req: Request, res: Response) => {
  const role = await settingsService.updateRolePermissions(req.user!.businessId!, req.params.id, req.body.permissionKeys);
  res.json({ success: true, data: role });
});

export const listAllPermissions = asyncHandler(async (_req: Request, res: Response) => {
  const permissions = await settingsService.listAllPermissions();
  res.json({ success: true, data: permissions });
});
