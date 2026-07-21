import { Router } from "express";
import { authenticate, requireBusiness, requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import * as catalogController from "../controllers/catalog.controller";
import {
  createBrandSchema,
  createCategorySchema,
  createUnitSchema,
  updateBrandSchema,
  updateCategorySchema,
} from "../validation/catalog.validation";

const router = Router();

router.use(authenticate, requireBusiness);

router.get("/categories", requirePermission("categories.view"), catalogController.listCategories);
router.post("/categories", requirePermission("categories.create"), validate(createCategorySchema), catalogController.createCategory);
router.patch("/categories/:id", requirePermission("categories.update"), validate(updateCategorySchema), catalogController.updateCategory);
router.delete("/categories/:id", requirePermission("categories.delete"), catalogController.deleteCategory);

router.get("/brands", requirePermission("brands.view"), catalogController.listBrands);
router.post("/brands", requirePermission("brands.create"), validate(createBrandSchema), catalogController.createBrand);
router.patch("/brands/:id", requirePermission("brands.update"), validate(updateBrandSchema), catalogController.updateBrand);
router.delete("/brands/:id", requirePermission("brands.delete"), catalogController.deleteBrand);

router.get("/units", catalogController.listUnits);
router.post("/units", requirePermission("products.create"), validate(createUnitSchema), catalogController.createUnit);

export default router;
