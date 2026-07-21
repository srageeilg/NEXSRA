import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { validate } from "../middleware/validate";
import { authenticate } from "../middleware/auth";
import { authRateLimiter } from "../middleware/rateLimiter";
import {
  registerBusinessSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  enable2faSchema,
  updateProfileSchema,
} from "../validation/auth.validation";

const router = Router();

router.post("/register", authRateLimiter, validate(registerBusinessSchema), authController.registerBusiness);
router.get("/verify-email", validate(verifyEmailSchema), authController.verifyEmail);
router.post("/login", authRateLimiter, validate(loginSchema), authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);
router.post("/forgot-password", authRateLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post("/reset-password", authRateLimiter, validate(resetPasswordSchema), authController.resetPassword);

router.use(authenticate);
router.get("/me", authController.getProfile);
router.patch("/me", validate(updateProfileSchema), authController.updateProfile);
router.post("/change-password", validate(changePasswordSchema), authController.changePassword);
router.post("/2fa/setup", authController.setupTwoFactor);
router.post("/2fa/enable", validate(enable2faSchema), authController.enableTwoFactor);
router.post("/2fa/disable", authController.disableTwoFactor);
router.get("/sessions", authController.listSessions);
router.delete("/sessions/:sessionId", authController.revokeSession);

export default router;
