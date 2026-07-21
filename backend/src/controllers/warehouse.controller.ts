import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as warehouseService from "../services/warehouse.service";

export const listWarehouses = asyncHandler(async (req: Request, res: Response) => {
  const warehouses = await warehouseService.listWarehouses(req.user!.businessId!);
  res.json({ success: true, data: warehouses });
});

export const createWarehouse = asyncHandler(async (req: Request, res: Response) => {
  const warehouse = await warehouseService.createWarehouse(req.user!.businessId!, req.body);
  res.status(201).json({ success: true, data: warehouse });
});

export const updateWarehouse = asyncHandler(async (req: Request, res: Response) => {
  const warehouse = await warehouseService.updateWarehouse(req.user!.businessId!, req.params.id, req.body);
  res.json({ success: true, data: warehouse });
});

export const deleteWarehouse = asyncHandler(async (req: Request, res: Response) => {
  await warehouseService.deleteWarehouse(req.user!.businessId!, req.params.id);
  res.json({ success: true, message: "Warehouse deactivated" });
});
