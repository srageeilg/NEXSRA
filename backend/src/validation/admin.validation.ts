import { z } from "zod";

export const updateBusinessStatusSchema = z.object({
  body: z.object({ status: z.enum(["APPROVED", "SUSPENDED", "REJECTED"]) }),
  params: z.object({ id: z.string().uuid() }),
});

export const updateUserSchema = z.object({
  body: z.object({
    role: z.enum([
      "SUPER_ADMIN",
      "BUSINESS_OWNER",
      "MANAGER",
      "ACCOUNTANT",
      "WAREHOUSE_STAFF",
      "CASHIER",
      "EMPLOYEE",
    ]).optional(),
    isActive: z.coerce.boolean().optional(),
  }),
  params: z.object({ id: z.string().uuid() }),
});

export const listAuditLogsQuerySchema = z.object({
  query: z.object({
    businessId: z.string().uuid().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(30),
  }),
});
