import { Router } from "express";
import { authenticate, requireBusiness, requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import * as customerController from "../controllers/customer.controller";
import { createCustomerSchema, listPartyQuerySchema, updateCustomerSchema } from "../validation/party.validation";

const router = Router();

router.use(authenticate, requireBusiness);

router.get("/", requirePermission("customers.view"), validate(listPartyQuerySchema), customerController.listCustomers);
router.get("/:id", requirePermission("customers.view"), customerController.getCustomer);
router.post("/", requirePermission("customers.create"), validate(createCustomerSchema), customerController.createCustomer);
router.patch("/:id", requirePermission("customers.update"), validate(updateCustomerSchema), customerController.updateCustomer);
router.delete("/:id", requirePermission("customers.delete"), customerController.deactivateCustomer);

export default router;
