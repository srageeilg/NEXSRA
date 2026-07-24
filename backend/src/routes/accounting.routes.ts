import { Router } from "express";
import { authenticate, requireBusiness, requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import * as accountingController from "../controllers/accounting.controller";
import { createAccountSchema, createJournalEntrySchema } from "../validation/accounting.validation";

const router = Router();

router.use(authenticate, requireBusiness);

router.get("/accounts", requirePermission("accounting.view"), accountingController.listAccounts);
router.post("/accounts", requirePermission("accounting.create"), validate(createAccountSchema), accountingController.createAccount);

router.get("/ledger/pdf", requirePermission("accounting.view"), accountingController.downloadGeneralLedgerPdf);
router.get("/trial-balance/pdf", requirePermission("accounting.view"), accountingController.downloadTrialBalancePdf);
router.get("/balance-sheet/pdf", requirePermission("accounting.view"), accountingController.downloadBalanceSheetPdf);
router.get(
  "/income-statement/pdf",
  requirePermission("accounting.view"),
  accountingController.downloadIncomeStatementPdf,
);

router.get("/journal-entries", requirePermission("accounting.view"), accountingController.listJournalEntries);
router.post(
  "/journal-entries",
  requirePermission("accounting.create"),
  validate(createJournalEntrySchema),
  accountingController.createJournalEntry,
);

export default router;
