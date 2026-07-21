import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as paymentService from "../services/payment.service";

export const listPayments = asyncHandler(async (req: Request, res: Response) => {
  const result = await paymentService.listPayments(req.user!.businessId!, req.query as never);
  res.json({ success: true, data: result.items, pagination: result.pagination });
});

export const recordPayment = asyncHandler(async (req: Request, res: Response) => {
  const payment = await paymentService.recordPayment(req.user!.businessId!, req.body);
  res.status(201).json({ success: true, data: payment });
});
