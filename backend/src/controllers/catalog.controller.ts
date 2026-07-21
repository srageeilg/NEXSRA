import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as catalogService from "../services/catalog.service";

export const listCategories = asyncHandler(async (req: Request, res: Response) => {
  const categories = await catalogService.listCategories(req.user!.businessId!);
  res.json({ success: true, data: categories });
});

export const createCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await catalogService.createCategory(req.user!.businessId!, req.body);
  res.status(201).json({ success: true, data: category });
});

export const updateCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await catalogService.updateCategory(req.user!.businessId!, req.params.id, req.body);
  res.json({ success: true, data: category });
});

export const deleteCategory = asyncHandler(async (req: Request, res: Response) => {
  await catalogService.deleteCategory(req.user!.businessId!, req.params.id);
  res.json({ success: true, message: "Category deleted" });
});

export const listBrands = asyncHandler(async (req: Request, res: Response) => {
  const brands = await catalogService.listBrands(req.user!.businessId!);
  res.json({ success: true, data: brands });
});

export const createBrand = asyncHandler(async (req: Request, res: Response) => {
  const brand = await catalogService.createBrand(req.user!.businessId!, req.body);
  res.status(201).json({ success: true, data: brand });
});

export const updateBrand = asyncHandler(async (req: Request, res: Response) => {
  const brand = await catalogService.updateBrand(req.user!.businessId!, req.params.id, req.body);
  res.json({ success: true, data: brand });
});

export const deleteBrand = asyncHandler(async (req: Request, res: Response) => {
  await catalogService.deleteBrand(req.user!.businessId!, req.params.id);
  res.json({ success: true, message: "Brand deleted" });
});

export const listUnits = asyncHandler(async (_req: Request, res: Response) => {
  const units = await catalogService.listUnits();
  res.json({ success: true, data: units });
});

export const createUnit = asyncHandler(async (req: Request, res: Response) => {
  const unit = await catalogService.createUnit(req.body);
  res.status(201).json({ success: true, data: unit });
});
