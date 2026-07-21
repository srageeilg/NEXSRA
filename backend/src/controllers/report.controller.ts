import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { toCsv } from "../utils/csv";
import * as reportService from "../services/report.service";

function respond(req: Request, res: Response, filename: string, report: { rows: Record<string, unknown>[] } & Record<string, unknown>) {
  if (req.query.format === "csv") {
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
    return res.send(toCsv(report.rows));
  }
  return res.json({ success: true, data: report });
}

function parseDates(req: Request) {
  const from = req.query.from ? new Date(req.query.from as string) : undefined;
  const to = req.query.to ? new Date(req.query.to as string) : undefined;
  return { from, to };
}

export const salesReport = asyncHandler(async (req: Request, res: Response) => {
  const { from, to } = parseDates(req);
  const report = await reportService.getSalesReport(req.user!.businessId!, from, to);
  respond(req, res, "sales-report", report);
});

export const purchaseReport = asyncHandler(async (req: Request, res: Response) => {
  const { from, to } = parseDates(req);
  const report = await reportService.getPurchaseReport(req.user!.businessId!, from, to);
  respond(req, res, "purchase-report", report);
});

export const inventoryReport = asyncHandler(async (req: Request, res: Response) => {
  const report = await reportService.getInventoryReport(req.user!.businessId!);
  respond(req, res, "inventory-report", report);
});

export const customerReport = asyncHandler(async (req: Request, res: Response) => {
  const report = await reportService.getCustomerReport(req.user!.businessId!);
  respond(req, res, "customer-report", report);
});

export const supplierReport = asyncHandler(async (req: Request, res: Response) => {
  const report = await reportService.getSupplierReport(req.user!.businessId!);
  respond(req, res, "supplier-report", report);
});

export const expenseReport = asyncHandler(async (req: Request, res: Response) => {
  const { from, to } = parseDates(req);
  const report = await reportService.getExpenseReport(req.user!.businessId!, from, to);
  respond(req, res, "expense-report", report);
});

export const employeeReport = asyncHandler(async (req: Request, res: Response) => {
  const report = await reportService.getEmployeeReport(req.user!.businessId!);
  respond(req, res, "employee-report", report);
});
