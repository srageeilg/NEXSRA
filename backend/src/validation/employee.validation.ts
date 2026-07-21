import { z } from "zod";

export const createDepartmentSchema = z.object({
  body: z.object({ name: z.string().min(1).max(120) }),
});

export const createEmployeeSchema = z.object({
  body: z.object({
    employeeCode: z.string().min(1).max(30),
    firstName: z.string().min(1).max(80),
    lastName: z.string().min(1).max(80),
    email: z.string().email().optional(),
    phone: z.string().max(30).optional(),
    designation: z.string().max(120).optional(),
    salary: z.coerce.number().nonnegative().optional(),
    departmentId: z.string().uuid().optional(),
    branchId: z.string().uuid().optional(),
    hireDate: z.coerce.date().optional(),
  }),
});

export const updateEmployeeSchema = z.object({
  body: createEmployeeSchema.shape.body.partial(),
  params: z.object({ id: z.string().uuid() }),
});

export const checkInSchema = z.object({
  body: z.object({ employeeId: z.string().uuid() }),
});

export const checkOutSchema = z.object({
  body: z.object({ employeeId: z.string().uuid() }),
});

export const createLeaveRequestSchema = z.object({
  body: z.object({
    employeeId: z.string().uuid(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    reason: z.string().max(500).optional(),
  }),
});

export const updateLeaveStatusSchema = z.object({
  body: z.object({ status: z.enum(["APPROVED", "REJECTED"]) }),
  params: z.object({ id: z.string().uuid() }),
});

export const createPerformanceNoteSchema = z.object({
  body: z.object({
    employeeId: z.string().uuid(),
    note: z.string().min(1).max(1000),
    rating: z.coerce.number().int().min(1).max(5).optional(),
  }),
});
