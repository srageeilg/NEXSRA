import { Router } from "express";
import { z } from "zod";
import { authenticate, requireBusiness } from "../middleware/auth";
import { aiRateLimiter } from "../middleware/rateLimiter";
import { validate } from "../middleware/validate";
import { chat } from "../controllers/ai.controller";

const chatSchema = z.object({
  body: z.object({
    message: z.string().min(1).max(2000),
    history: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string().max(4000),
        }),
      )
      .max(20)
      .optional()
      .default([]),
  }),
});

const router = Router();
router.use(authenticate, requireBusiness, aiRateLimiter);
router.post("/chat", validate(chatSchema), chat);

export default router;
