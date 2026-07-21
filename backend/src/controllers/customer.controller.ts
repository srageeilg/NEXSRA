import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as customerService from "../services/customer.service";

export const listCustomers = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const result = await customerService.listCustomers(req.user!.businessId!, {
    page: Math.max(1, Number(q.page) || 1),
    pageSize: Math.min(100, Math.max(1, Number(q.pageSize) || 20)),
    search: q.search || undefined,
  });
  res.json({ success: true, data: result.items, pagination: result.pagination });
});

export const getCustomer = asyncHandler(async (req: Request, res: Response) => {
  const customer = await customerService.getCustomerById(req.user!.businessId!, req.params.id);
  res.json({ success: true, data: customer });
});

export const createCustomer = asyncHandler(async (req: Request, res: Response) => {
  const customer = await customerService.createCustomer(req.user!.businessId!, req.body);
  res.status(201).json({ success: true, data: customer });
});

export const updateCustomer = asyncHandler(async (req: Request, res: Response) => {
  const customer = await customerService.updateCustomer(req.user!.businessId!, req.params.id, req.body);
  res.json({ success: true, data: customer });
});

export const deactivateCustomer = asyncHandler(async (req: Request, res: Response) => {
  await customerService.deactivateCustomer(req.user!.businessId!, req.params.id);
  res.json({ success: true, message: "Customer deactivated" });
});
