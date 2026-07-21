import { Router } from "express";
import { authenticate, requireBusiness, requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import * as warehouseController from "../controllers/warehouse.controller";
import { createWarehouseSchema, updateWarehouseSchema } from "../validation/inventory.validation";

const router = Router();

router.use(authenticate, requireBusiness);

router.get("/", requirePermission("warehouses.view"), warehouseController.listWarehouses);
router.post("/", requirePermission("warehouses.create"), validate(createWarehouseSchema), warehouseController.createWarehouse);
router.patch("/:id", requirePermission("warehouses.update"), validate(updateWarehouseSchema), warehouseController.updateWarehouse);
router.delete("/:id", requirePermission("warehouses.delete"), warehouseController.deleteWarehouse);

export default router;
