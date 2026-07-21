import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as supplierService from "../services/supplier.service";

export const listSuppliers = asyncHandler(async (req: Request, res: Response) => {
  const result = await supplierService.listSuppliers(req.user!.businessId!, req.query as never);
  res.json({ success: true, data: result.items, pagination: result.pagination });
});

export const getSupplier = asyncHandler(async (req: Request, res: Response) => {
  const supplier = await supplierService.getSupplierById(req.user!.businessId!, req.params.id);
  res.json({ success: true, data: supplier });
});

export const createSupplier = asyncHandler(async (req: Request, res: Response) => {
  const supplier = await supplierService.createSupplier(req.user!.businessId!, req.body);
  res.status(201).json({ success: true, data: supplier });
});

export const updateSupplier = asyncHandler(async (req: Request, res: Response) => {
  const supplier = await supplierService.updateSupplier(req.user!.businessId!, req.params.id, req.body);
  res.json({ success: true, data: supplier });
});

export const deactivateSupplier = asyncHandler(async (req: Request, res: Response) => {
  await supplierService.deactivateSupplier(req.user!.businessId!, req.params.id);
  res.json({ success: true, message: "Supplier deactivated" });
});
