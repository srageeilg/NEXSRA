import { Router } from "express";
import { authenticate, requireBusiness } from "../middleware/auth";
import * as dashboardController from "../controllers/dashboard.controller";

const router = Router();

router.use(authenticate, requireBusiness);
router.get("/summary", dashboardController.getSummary);

export default router;
