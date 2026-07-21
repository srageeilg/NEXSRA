import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as inventoryService from "../services/inventory.service";

export const listStock = asyncHandler(async (req: Request, res: Response) => {
  const result = await inventoryService.listStock(req.user!.businessId!, req.query as never);
  res.json({ success: true, data: result.items, pagination: result.pagination });
});

export const listMovements = asyncHandler(async (req: Request, res: Response) => {
  const result = await inventoryService.listMovements(req.user!.businessId!, req.query as never);
  res.json({ success: true, data: result.items, pagination: result.pagination });
});

export const stockIn = asyncHandler(async (req: Request, res: Response) => {
  const movement = await inventoryService.stockIn(req.user!.businessId!, { ...req.body, performedById: req.user!.sub });
  res.status(201).json({ success: true, data: movement });
});

export const stockOut = asyncHandler(async (req: Request, res: Response) => {
  const movement = await inventoryService.stockOut(req.user!.businessId!, { ...req.body, performedById: req.user!.sub });
  res.status(201).json({ success: true, data: movement });
});

export const markDamaged = asyncHandler(async (req: Request, res: Response) => {
  const movement = await inventoryService.markDamaged(req.user!.businessId!, { ...req.body, performedById: req.user!.sub });
  res.status(201).json({ success: true, data: movement });
});

export const markReturned = asyncHandler(async (req: Request, res: Response) => {
  const movement = await inventoryService.markReturned(req.user!.businessId!, {
    ...req.body,
    performedById: req.user!.sub,
  });
  res.status(201).json({ success: true, data: movement });
});

export const transferStock = asyncHandler(async (req: Request, res: Response) => {
  const movement = await inventoryService.transferStock(req.user!.businessId!, {
    ...req.body,
    performedById: req.user!.sub,
  });
  res.status(201).json({ success: true, data: movement });
});

export const adjustStock = asyncHandler(async (req: Request, res: Response) => {
  const movement = await inventoryService.adjustStock(req.user!.businessId!, {
    ...req.body,
    performedById: req.user!.sub,
  });
  res.status(201).json({ success: true, data: movement });
});
