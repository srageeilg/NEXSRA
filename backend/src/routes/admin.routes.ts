import { Router } from "express";
import { SystemRole } from "@prisma/client";
import { authenticate, authorizeRoles } from "../middleware/auth";
import { validate } from "../middleware/validate";
import * as adminController from "../controllers/admin.controller";
import {
  createBusinessSchema,
  listAuditLogsQuerySchema,
  resetUserPasswordSchema,
  updateBusinessPlanSchema,
  updateBusinessStatusSchema,
  updateUserSchema,
} from "../validation/admin.validation";

const router = Router();

router.use(authenticate, authorizeRoles(SystemRole.SUPER_ADMIN));

router.get("/stats", adminController.getSystemStats);

router.get("/businesses", adminController.listBusinesses);
router.post("/businesses", validate(createBusinessSchema), adminController.createBusiness);
router.patch("/businesses/:id/status", validate(updateBusinessStatusSchema), adminController.updateBusinessStatus);
router.patch("/businesses/:id/plan", validate(updateBusinessPlanSchema), adminController.updateBusinessPlan);

router.get("/users", adminController.listUsers);
router.patch("/users/:id", validate(updateUserSchema), adminController.updateUser);
router.post("/users/:id/reset-password", validate(resetUserPasswordSchema), adminController.resetUserPassword);

router.get("/audit-logs", validate(listAuditLogsQuerySchema), adminController.listAuditLogs);

export default router;
