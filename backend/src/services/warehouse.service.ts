import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";

export async function listWarehouses(businessId: string) {
  return prisma.warehouse.findMany({
    where: { businessId },
    include: { branch: true, _count: { select: { stocks: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createWarehouse(
  businessId: string,
  data: { name: string; code: string; branchId?: string; address?: string },
) {
  const existing = await prisma.warehouse.findFirst({ where: { businessId, code: data.code } });
  if (existing) throw ApiError.conflict("A warehouse with this code already exists");
  return prisma.warehouse.create({ data: { ...data, businessId } });
}

export async function updateWarehouse(
  businessId: string,
  id: string,
  data: { name?: string; code?: string; branchId?: string; address?: string; isActive?: boolean },
) {
  const warehouse = await prisma.warehouse.findFirst({ where: { id, businessId } });
  if (!warehouse) throw ApiError.notFound("Warehouse not found");
  return prisma.warehouse.update({ where: { id }, data });
}

export async function deleteWarehouse(businessId: string, id: string) {
  const warehouse = await prisma.warehouse.findFirst({ where: { id, businessId } });
  if (!warehouse) throw ApiError.notFound("Warehouse not found");
  await prisma.warehouse.update({ where: { id }, data: { isActive: false } });
}
