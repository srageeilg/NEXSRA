import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as expenseService from "../services/expense.service";

export const listExpenseCategories = asyncHandler(async (req: Request, res: Response) => {
  const categories = await expenseService.listExpenseCategories(req.user!.businessId!);
  res.json({ success: true, data: categories });
});

export const createExpenseCategory = asyncHandler(async (req: Request, res: Response) => {
  const category = await expenseService.createExpenseCategory(req.user!.businessId!, req.body);
  res.status(201).json({ success: true, data: category });
});

export const listExpenses = asyncHandler(async (req: Request, res: Response) => {
  const q = req.query as Record<string, string | undefined>;
  const result = await expenseService.listExpenses(req.user!.businessId!, {
    page: Math.max(1, Number(q.page) || 1),
    pageSize: Math.min(100, Math.max(1, Number(q.pageSize) || 20)),
    status: q.status as never,
    categoryId: q.categoryId || undefined,
  });
  res.json({ success: true, data: result.items, pagination: result.pagination });
});

export const createExpense = asyncHandler(async (req: Request, res: Response) => {
  const expense = await expenseService.createExpense(req.user!.businessId!, req.body, req.user!.sub);
  res.status(201).json({ success: true, data: expense });
});

export const updateExpenseStatus = asyncHandler(async (req: Request, res: Response) => {
  const expense = await expenseService.updateExpenseStatus(
    req.user!.businessId!,
    req.params.id,
    req.body.status,
    req.user!.sub,
  );
  res.json({ success: true, data: expense });
});
