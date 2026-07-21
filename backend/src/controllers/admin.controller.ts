import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as adminService from "../services/admin.service";

export const listBusinesses = asyncHandler(async (req: Request, res: Response) => {
  const businesses = await adminService.listBusinesses(req.query.status as never);
  res.json({ success: true, data: businesses });
});

export const updateBusinessStatus = asyncHandler(async (req: Request, res: Response) => {
  const business = await adminService.updateBusinessStatus(req.params.id, req.body.status);
  res.json({ success: true, data: business });
});

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const users = await adminService.listUsers(req.query.businessId as string | undefined);
  res.json({ success: true, data: users });
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await adminService.updateUser(req.params.id, req.body);
  res.json({ success: true, data: user });
});

export const listAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const result = await adminService.listAuditLogs({
    page: Math.max(1, Number(q.page) || 1),
    pageSize: Math.min(100, Math.max(1, Number(q.pageSize) || 20)),
    businessId: q.businessId || undefined,
  });
  res.json({ success: true, data: result.items, pagination: result.pagination });
});

export const getSystemStats = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await adminService.getSystemStats();
  res.json({ success: true, data: stats });
});
