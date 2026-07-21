import { Router } from "express";
import { authenticate, requireBusiness, requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import * as expenseController from "../controllers/expense.controller";
import {
  createExpenseCategorySchema,
  createExpenseSchema,
  listExpensesQuerySchema,
  updateExpenseStatusSchema,
} from "../validation/accounting.validation";

const router = Router();

router.use(authenticate, requireBusiness);

router.get("/categories", requirePermission("expenses.view"), expenseController.listExpenseCategories);
router.post(
  "/categories",
  requirePermission("expenses.create"),
  validate(createExpenseCategorySchema),
  expenseController.createExpenseCategory,
);

router.get("/", requirePermission("expenses.view"), validate(listExpensesQuerySchema), expenseController.listExpenses);
router.post("/", requirePermission("expenses.create"), validate(createExpenseSchema), expenseController.createExpense);
router.patch(
  "/:id/status",
  requirePermission("expenses.approve"),
  validate(updateExpenseStatusSchema),
  expenseController.updateExpenseStatus,
);

export default router;
