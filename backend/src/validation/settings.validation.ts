import { z } from "zod";

export const updateBusinessProfileSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(150).optional(),
    logoUrl: z.string().max(500).optional(),
    phone: z.string().max(30).optional(),
    address: z.string().max(300).optional(),
    website: z.string().max(200).optional(),
    currency: z.string().length(3).optional(),
    timezone: z.string().max(60).optional(),
    fiscalYearStart: z.coerce.number().int().min(1).max(12).optional(),
    invoicePrefix: z.string().max(10).optional(),
    invoiceTemplate: z.string().max(30).optional(),
  }),
});

export const upsertSettingSchema = z.object({
  body: z.object({
    key: z.string().min(1).max(80),
    value: z.unknown(),
  }),
});

export const updateRolePermissionsSchema = z.object({
  body: z.object({ permissionKeys: z.array(z.string()) }),
  params: z.object({ id: z.string().uuid() }),
});
