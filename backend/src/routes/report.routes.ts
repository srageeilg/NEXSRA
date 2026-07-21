import { Router } from "express";
import { authenticate, requireBusiness, requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import * as reportController from "../controllers/report.controller";
import { dateRangeQuerySchema } from "../validation/report.validation";

const router = Router();

router.use(authenticate, requireBusiness, requirePermission("reports.view"));

router.get("/sales", validate(dateRangeQuerySchema), reportController.salesReport);
router.get("/purchases", validate(dateRangeQuerySchema), reportController.purchaseReport);
router.get("/inventory", reportController.inventoryReport);
router.get("/customers", reportController.customerReport);
router.get("/suppliers", reportController.supplierReport);
router.get("/expenses", validate(dateRangeQuerySchema), reportController.expenseReport);
router.get("/employees", reportController.employeeReport);

export default router;
