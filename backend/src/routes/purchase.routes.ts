import { Router } from "express";
import { authenticate, requireBusiness, requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import * as purchaseController from "../controllers/purchase.controller";
import {
  createPurchaseOrderSchema,
  listPurchaseOrdersQuerySchema,
  receiveGoodsSchema,
} from "../validation/purchase.validation";

const router = Router();

router.use(authenticate, requireBusiness);

router.get("/", requirePermission("purchases.view"), validate(listPurchaseOrdersQuerySchema), purchaseController.listPurchaseOrders);
router.get("/:id", requirePermission("purchases.view"), purchaseController.getPurchaseOrder);
router.post("/", requirePermission("purchases.create"), validate(createPurchaseOrderSchema), purchaseController.createPurchaseOrder);
router.post("/:id/receive", requirePermission("purchases.update"), validate(receiveGoodsSchema), purchaseController.receiveGoods);

export default router;
