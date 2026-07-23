import { z } from "zod";

export const createSupplierSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(150),
    contactPerson: z.string().max(150).optional(),
    email: z.string().email().optional(),
    phone: z.string().max(30).optional(),
    address: z.string().max(300).optional(),
    openingBalance: z.coerce.number().default(0),
  }),
});

export const updateSupplierSchema = z.object({
  body: createSupplierSchema.shape.body.partial(),
  params: z.object({ id: z.string().uuid() }),
});

export const createCustomerSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(150),
    email: z.string().email().optional(),
    phone: z.string().max(30).optional(),
    address: z.string().max(300).optional(),
    panNumber: z.string().max(30).optional(),
    creditLimit: z.coerce.number().nonnegative().default(0),
    openingBalance: z.coerce.number().default(0),
  }),
});

export const updateCustomerSchema = z.object({
  body: createCustomerSchema.shape.body.partial(),
  params: z.object({ id: z.string().uuid() }),
});

export const listPartyQuerySchema = z.object({
  query: z.object({
    search: z.string().max(200).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
});
