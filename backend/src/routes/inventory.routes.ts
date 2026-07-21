import { Router } from "express";
import { authenticate, requireBusiness, requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import * as inventoryController from "../controllers/inventory.controller";
import {
  adjustmentSchema,
  damagedReturnedSchema,
  listMovementsQuerySchema,
  listStockQuerySchema,
  stockInSchema,
  stockOutSchema,
  transferStockSchema,
} from "../validation/inventory.validation";

const router = Router();

router.use(authenticate, requireBusiness);

router.get("/stock", requirePermission("inventory.view"), validate(listStockQuerySchema), inventoryController.listStock);
router.get("/movements", requirePermission("inventory.view"), validate(listMovementsQuerySchema), inventoryController.listMovements);

router.post("/stock-in", requirePermission("inventory.create"), validate(stockInSchema), inventoryController.stockIn);
router.post("/stock-out", requirePermission("inventory.create"), validate(stockOutSchema), inventoryController.stockOut);
router.post("/damaged", requirePermission("inventory.create"), validate(damagedReturnedSchema), inventoryController.markDamaged);
router.post("/returned", requirePermission("inventory.create"), validate(damagedReturnedSchema), inventoryController.markReturned);
router.post("/transfer", requirePermission("inventory.create"), validate(transferStockSchema), inventoryController.transferStock);
router.post("/adjustment", requirePermission("inventory.update"), validate(adjustmentSchema), inventoryController.adjustStock);

export default router;
