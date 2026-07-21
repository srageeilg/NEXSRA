import { Router } from "express";
import { authenticate, requireBusiness, requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import * as salesController from "../controllers/sales.controller";
import { createSalesOrderSchema, listSalesOrdersQuerySchema, posCheckoutSchema } from "../validation/sales.validation";

const router = Router();

router.use(authenticate, requireBusiness);

router.get("/", requirePermission("sales.view"), validate(listSalesOrdersQuerySchema), salesController.listSalesOrders);
router.get("/:id", requirePermission("sales.view"), salesController.getSalesOrder);
router.post("/", requirePermission("sales.create"), validate(createSalesOrderSchema), salesController.createSalesOrder);
router.post("/pos/checkout", requirePermission("pos.create"), validate(posCheckoutSchema), salesController.posCheckout);

export default router;
