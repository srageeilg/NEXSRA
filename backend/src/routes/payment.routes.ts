import { Router } from "express";
import { authenticate, requireBusiness, requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import * as paymentController from "../controllers/payment.controller";
import { listPaymentsQuerySchema, recordPaymentSchema } from "../validation/payment.validation";

const router = Router();

router.use(authenticate, requireBusiness);

router.get("/", requirePermission("payments.view"), validate(listPaymentsQuerySchema), paymentController.listPayments);
router.post("/", requirePermission("payments.create"), validate(recordPaymentSchema), paymentController.recordPayment);

export default router;
