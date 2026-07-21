import { Request, Response } from "express";
import qrcode from "qrcode";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import * as productService from "../services/product.service";
import { resolveUploadedFileUrl } from "../services/storage.service";

export const listProducts = asyncHandler(async (req: Request, res: Response) => {
  const result = await productService.listProducts(req.user!.businessId!, req.query as never);
  res.json({ success: true, data: result.items, pagination: result.pagination });
});

export const getProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.getProductById(req.user!.businessId!, req.params.id);
  res.json({ success: true, data: product });
});

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.createProduct(req.user!.businessId!, req.body);
  res.status(201).json({ success: true, data: product });
});

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.updateProduct(req.user!.businessId!, req.params.id, req.body);
  res.json({ success: true, data: product });
});

export const deactivateProduct = asyncHandler(async (req: Request, res: Response) => {
  await productService.deactivateProduct(req.user!.businessId!, req.params.id);
  res.json({ success: true, message: "Product deactivated" });
});

export const uploadProductImage = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw ApiError.badRequest("No image file provided");
  const url = await resolveUploadedFileUrl(req.file);
  const isPrimary = req.body.isPrimary === "true";
  const image = await productService.addProductImage(req.user!.businessId!, req.params.id, url, isPrimary);
  res.status(201).json({ success: true, data: image });
});

export const removeProductImage = asyncHandler(async (req: Request, res: Response) => {
  await productService.removeProductImage(req.user!.businessId!, req.params.id, req.params.imageId);
  res.json({ success: true, message: "Image removed" });
});

export const getProductQrCode = asyncHandler(async (req: Request, res: Response) => {
  const product = await productService.getProductById(req.user!.businessId!, req.params.id);
  const dataUrl = await qrcode.toDataURL(product.qrCode ?? product.sku);
  res.json({ success: true, data: { qrDataUrl: dataUrl } });
});
