import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as accountingService from "../services/accounting.service";

export const listAccounts = asyncHandler(async (req: Request, res: Response) => {
  const accounts = await accountingService.listAccounts(req.user!.businessId!);
  res.json({ success: true, data: accounts });
});

export const createAccount = asyncHandler(async (req: Request, res: Response) => {
  const account = await accountingService.createAccount(req.user!.businessId!, req.body);
  res.status(201).json({ success: true, data: account });
});

export const listJournalEntries = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const result = await accountingService.listJournalEntries(req.user!.businessId!, {
    page: Math.max(1, Number(q.page) || 1),
    pageSize: Math.min(100, Math.max(1, Number(q.pageSize) || 20)),
  });
  res.json({ success: true, data: result.items, pagination: result.pagination });
});

export const createJournalEntry = asyncHandler(async (req: Request, res: Response) => {
  const entry = await accountingService.createJournalEntry(req.user!.businessId!, req.body);
  res.status(201).json({ success: true, data: entry });
});

export const downloadGeneralLedgerPdf = asyncHandler(async (req: Request, res: Response) => {
  const pdf = await accountingService.generateGeneralLedgerPdf(req.user!.businessId!);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="general-ledger.pdf"`);
  res.send(pdf);
});

export const downloadTrialBalancePdf = asyncHandler(async (req: Request, res: Response) => {
  const pdf = await accountingService.generateTrialBalancePdf(req.user!.businessId!);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="trial-balance.pdf"`);
  res.send(pdf);
});

export const downloadBalanceSheetPdf = asyncHandler(async (req: Request, res: Response) => {
  const pdf = await accountingService.generateBalanceSheetPdf(req.user!.businessId!);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="balance-sheet.pdf"`);
  res.send(pdf);
});

export const downloadIncomeStatementPdf = asyncHandler(async (req: Request, res: Response) => {
  const pdf = await accountingService.generateIncomeStatementPdf(req.user!.businessId!);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="income-statement.pdf"`);
  res.send(pdf);
});

export const downloadVatReturnPdf = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const from = q.from ? new Date(q.from) : undefined;
  const to = q.to ? new Date(q.to) : undefined;
  const pdf = await accountingService.generateVatReturnPdf(req.user!.businessId!, from, to);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="vat-return.pdf"`);
  res.send(pdf);
});

export const downloadArAgingPdf = asyncHandler(async (req: Request, res: Response) => {
  const pdf = await accountingService.generateArAgingPdf(req.user!.businessId!);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="ar-aging.pdf"`);
  res.send(pdf);
});

export const downloadApAgingPdf = asyncHandler(async (req: Request, res: Response) => {
  const pdf = await accountingService.generateApAgingPdf(req.user!.businessId!);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="ap-aging.pdf"`);
  res.send(pdf);
});
