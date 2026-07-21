import { Router } from "express";
import { authenticate, requireBusiness, requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import * as supplierController from "../controllers/supplier.controller";
import { createSupplierSchema, listPartyQuerySchema, updateSupplierSchema } from "../validation/party.validation";

const router = Router();

router.use(authenticate, requireBusiness);

router.get("/", requirePermission("suppliers.view"), validate(listPartyQuerySchema), supplierController.listSuppliers);
router.get("/:id", requirePermission("suppliers.view"), supplierController.getSupplier);
router.post("/", requirePermission("suppliers.create"), validate(createSupplierSchema), supplierController.createSupplier);
router.patch("/:id", requirePermission("suppliers.update"), validate(updateSupplierSchema), supplierController.updateSupplier);
router.delete("/:id", requirePermission("suppliers.delete"), supplierController.deactivateSupplier);

export default router;
