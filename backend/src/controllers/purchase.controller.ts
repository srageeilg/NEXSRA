import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as purchaseService from "../services/purchase.service";

export const listPurchaseOrders = asyncHandler(async (req: Request, res: Response) => {
  const result = await purchaseService.listPurchaseOrders(req.user!.businessId!, req.query as never);
  res.json({ success: true, data: result.items, pagination: result.pagination });
});

export const getPurchaseOrder = asyncHandler(async (req: Request, res: Response) => {
  const po = await purchaseService.getPurchaseOrderById(req.user!.businessId!, req.params.id);
  res.json({ success: true, data: po });
});

export const createPurchaseOrder = asyncHandler(async (req: Request, res: Response) => {
  const po = await purchaseService.createPurchaseOrder(req.user!.businessId!, req.body);
  res.status(201).json({ success: true, data: po });
});

export const receiveGoods = asyncHandler(async (req: Request, res: Response) => {
  const po = await purchaseService.receiveGoods(req.user!.businessId!, req.params.id, req.body, req.user!.sub);
  res.json({ success: true, data: po });
});
