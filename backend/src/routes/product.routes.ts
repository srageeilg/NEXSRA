import { Router } from "express";
import { authenticate, requireBusiness, requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { upload } from "../middleware/upload";
import * as productController from "../controllers/product.controller";
import { createProductSchema, listProductsQuerySchema, updateProductSchema } from "../validation/catalog.validation";

const router = Router();

router.use(authenticate, requireBusiness);

router.get("/", requirePermission("products.view"), validate(listProductsQuerySchema), productController.listProducts);
router.get("/:id", requirePermission("products.view"), productController.getProduct);
router.get("/:id/qrcode", requirePermission("products.view"), productController.getProductQrCode);
router.post("/", requirePermission("products.create"), validate(createProductSchema), productController.createProduct);
router.patch("/:id", requirePermission("products.update"), validate(updateProductSchema), productController.updateProduct);
router.delete("/:id", requirePermission("products.delete"), productController.deactivateProduct);

router.post(
  "/:id/images",
  requirePermission("products.update"),
  upload.single("image"),
  productController.uploadProductImage,
);
router.delete("/:id/images/:imageId", requirePermission("products.update"), productController.removeProductImage);

export default router;
