import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";

export async function listDepartments(businessId: string) {
  return prisma.department.findMany({
    where: { businessId },
    include: { _count: { select: { employees: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createDepartment(businessId: string, data: { name: string }) {
  return prisma.department.create({ data: { ...data, businessId } });
}

export async function listEmployees(businessId: string) {
  return prisma.employee.findMany({
    where: { businessId },
    include: { department: true, branch: true },
    orderBy: { firstName: "asc" },
  });
}

interface EmployeeInput {
  employeeCode: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  designation?: string;
  salary?: number;
  departmentId?: string;
  branchId?: string;
  hireDate?: Date;
}

export async function createEmployee(businessId: string, data: EmployeeInput) {
  const existing = await prisma.employee.findFirst({ where: { businessId, employeeCode: data.employeeCode } });
  if (existing) throw ApiError.conflict("An employee with this code already exists");
  return prisma.employee.create({ data: { ...data, businessId }, include: { department: true, branch: true } });
}

export async function updateEmployee(businessId: string, id: string, data: Partial<EmployeeInput>) {
  const employee = await prisma.employee.findFirst({ where: { id, businessId } });
  if (!employee) throw ApiError.notFound("Employee not found");
  return prisma.employee.update({ where: { id }, data });
}

export async function deactivateEmployee(businessId: string, id: string) {
  const employee = await prisma.employee.findFirst({ where: { id, businessId } });
  if (!employee) throw ApiError.notFound("Employee not found");
  await prisma.employee.update({ where: { id }, data: { isActive: false } });
}

export async function addPerformanceNote(businessId: string, data: { employeeId: string; note: string; rating?: number }) {
  const employee = await prisma.employee.findFirst({ where: { id: data.employeeId, businessId } });
  if (!employee) throw ApiError.notFound("Employee not found");
  return prisma.performanceNote.create({ data });
}
