import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { getDashboardSummary } from "../services/dashboard.service";

export const getSummary = asyncHandler(async (req: Request, res: Response) => {
  const summary = await getDashboardSummary(req.user!.businessId!);
  res.json({ success: true, data: summary });
});
