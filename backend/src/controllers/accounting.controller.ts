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
  const result = await accountingService.listJournalEntries(req.user!.businessId!, req.query as never);
  res.json({ success: true, data: result.items, pagination: result.pagination });
});

export const createJournalEntry = asyncHandler(async (req: Request, res: Response) => {
  const entry = await accountingService.createJournalEntry(req.user!.businessId!, req.body);
  res.status(201).json({ success: true, data: entry });
});
