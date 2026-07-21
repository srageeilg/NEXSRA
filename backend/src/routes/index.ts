import { Router } from "express";
import authRoutes from "./auth.routes";
import dashboardRoutes from "./dashboard.routes";
import catalogRoutes from "./catalog.routes";
import productRoutes from "./product.routes";
import warehouseRoutes from "./warehouse.routes";
import inventoryRoutes from "./inventory.routes";
import supplierRoutes from "./supplier.routes";
import customerRoutes from "./customer.routes";
import salesRoutes from "./sales.routes";
import purchaseRoutes from "./purchase.routes";
import invoiceRoutes from "./invoice.routes";
import paymentRoutes from "./payment.routes";
import accountingRoutes from "./accounting.routes";
import expenseRoutes from "./expense.routes";
import employeeRoutes from "./employee.routes";
import reportRoutes from "./report.routes";
import adminRoutes from "./admin.routes";
import settingsRoutes from "./settings.routes";
import aiRoutes from "./ai.routes";

const router = Router();

router.get("/health", (_req, res) => res.json({ success: true, message: "OK", timestamp: new Date().toISOString() }));

router.use("/auth", authRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/catalog", catalogRoutes);
router.use("/products", productRoutes);
router.use("/warehouses", warehouseRoutes);
router.use("/inventory", inventoryRoutes);
router.use("/suppliers", supplierRoutes);
router.use("/customers", customerRoutes);
router.use("/sales", salesRoutes);
router.use("/purchases", purchaseRoutes);
router.use("/invoices", invoiceRoutes);
router.use("/payments", paymentRoutes);
router.use("/accounting", accountingRoutes);
router.use("/expenses", expenseRoutes);
router.use("/employees", employeeRoutes);
router.use("/reports", reportRoutes);
router.use("/admin", adminRoutes);
router.use("/settings", settingsRoutes);
router.use("/ai", aiRoutes);

export default router;
