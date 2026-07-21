import { Router } from "express";
import { authenticate, requireBusiness, requirePermission } from "../middleware/auth";
import * as invoiceController from "../controllers/invoice.controller";

const router = Router();

router.use(authenticate, requireBusiness);

router.get("/", requirePermission("invoices.view"), invoiceController.listInvoices);
router.get("/:id", requirePermission("invoices.view"), invoiceController.getInvoice);
router.get("/:id/pdf", requirePermission("invoices.view"), invoiceController.downloadInvoicePdf);

export default router;
