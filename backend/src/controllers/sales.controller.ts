import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as salesService from "../services/sales.service";

export const listSalesOrders = asyncHandler(async (req: Request, res: Response) => {
  const result = await salesService.listSalesOrders(req.user!.businessId!, req.query as never);
  res.json({ success: true, data: result.items, pagination: result.pagination });
});

export const getSalesOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await salesService.getSalesOrderById(req.user!.businessId!, req.params.id);
  res.json({ success: true, data: order });
});

export const createSalesOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await salesService.createSalesOrder(req.user!.businessId!, req.body, req.user!.sub);
  res.status(201).json({ success: true, data: order });
});

export const posCheckout = asyncHandler(async (req: Request, res: Response) => {
  const result = await salesService.posCheckout(req.user!.businessId!, req.body, req.user!.sub);
  res.status(201).json({ success: true, data: result });
});
