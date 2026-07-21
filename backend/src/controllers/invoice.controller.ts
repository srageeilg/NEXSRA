import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as invoiceService from "../services/invoice.service";

export const listInvoices = asyncHandler(async (req: Request, res: Response) => {
  const result = await invoiceService.listInvoices(req.user!.businessId!, req.query as never);
  res.json({ success: true, data: result.items, pagination: result.pagination });
});

export const getInvoice = asyncHandler(async (req: Request, res: Response) => {
  const invoice = await invoiceService.getInvoiceById(req.user!.businessId!, req.params.id);
  res.json({ success: true, data: invoice });
});

export const downloadInvoicePdf = asyncHandler(async (req: Request, res: Response) => {
  const pdf = await invoiceService.generateInvoicePdf(req.user!.businessId!, req.params.id);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="invoice-${req.params.id}.pdf"`);
  res.send(pdf);
});
