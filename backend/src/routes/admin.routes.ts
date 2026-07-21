import { Router } from "express";
import { SystemRole } from "@prisma/client";
import { authenticate, authorizeRoles } from "../middleware/auth";
import { validate } from "../middleware/validate";
import * as adminController from "../controllers/admin.controller";
import { listAuditLogsQuerySchema, updateBusinessStatusSchema, updateUserSchema } from "../validation/admin.validation";

const router = Router();

router.use(authenticate, authorizeRoles(SystemRole.SUPER_ADMIN));

router.get("/stats", adminController.getSystemStats);

router.get("/businesses", adminController.listBusinesses);
router.patch("/businesses/:id/status", validate(updateBusinessStatusSchema), adminController.updateBusinessStatus);

router.get("/users", adminController.listUsers);
router.patch("/users/:id", validate(updateUserSchema), adminController.updateUser);

router.get("/audit-logs", validate(listAuditLogsQuerySchema), adminController.listAuditLogs);

export default router;
