import { Router } from "express";
import { authenticate, requireBusiness, requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import * as settingsController from "../controllers/settings.controller";
import {
  updateBusinessProfileSchema,
  updateRolePermissionsSchema,
  upsertSettingSchema,
} from "../validation/settings.validation";

const router = Router();

router.use(authenticate, requireBusiness);

router.get("/business", requirePermission("business.view"), settingsController.getBusinessProfile);
router.patch(
  "/business",
  requirePermission("business.update"),
  validate(updateBusinessProfileSchema),
  settingsController.updateBusinessProfile,
);

router.get("/", requirePermission("settings.view"), settingsController.getSettings);
router.put("/", requirePermission("settings.update"), validate(upsertSettingSchema), settingsController.upsertSetting);

router.get("/roles", requirePermission("roles.view"), settingsController.listRoleDefinitions);
router.patch(
  "/roles/:id/permissions",
  requirePermission("roles.update"),
  validate(updateRolePermissionsSchema),
  settingsController.updateRolePermissions,
);
router.get("/permissions", requirePermission("roles.view"), settingsController.listAllPermissions);

export default router;
