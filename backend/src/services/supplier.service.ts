import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";

interface ListParams {
  search?: string;
  page: number;
  pageSize: number;
}

export async function listSuppliers(businessId: string, params: ListParams) {
  const where: Prisma.SupplierWhereInput = {
    businessId,
    ...(params.search && {
      OR: [
        { name: { contains: params.search, mode: "insensitive" } },
        { email: { contains: params.search, mode: "insensitive" } },
        { phone: { contains: params.search, mode: "insensitive" } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      include: {
        _count: { select: { purchaseOrders: true } },
        ledgerEntries: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { name: "asc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.supplier.count({ where }),
  ]);

  const withBalance = items.map((s) => ({
    ...s,
    outstandingBalance: s.ledgerEntries[0]?.balance ?? s.openingBalance,
  }));

  return {
    items: withBalance,
    pagination: { page: params.page, pageSize: params.pageSize, total, totalPages: Math.ceil(total / params.pageSize) },
  };
}

export async function getSupplierById(businessId: string, id: string) {
  const supplier = await prisma.supplier.findFirst({
    where: { id, businessId },
    include: {
      purchaseOrders: { orderBy: { createdAt: "desc" }, take: 20 },
      ledgerEntries: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!supplier) throw ApiError.notFound("Supplier not found");
  return supplier;
}

interface SupplierInput {
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  openingBalance?: number;
}

export async function createSupplier(businessId: string, data: SupplierInput) {
  return prisma.supplier.create({ data: { ...data, businessId } });
}

export async function updateSupplier(businessId: string, id: string, data: Partial<SupplierInput>) {
  const supplier = await prisma.supplier.findFirst({ where: { id, businessId } });
  if (!supplier) throw ApiError.notFound("Supplier not found");
  return prisma.supplier.update({ where: { id }, data });
}

export async function deactivateSupplier(businessId: string, id: string) {
  const supplier = await prisma.supplier.findFirst({ where: { id, businessId } });
  if (!supplier) throw ApiError.notFound("Supplier not found");
  await prisma.supplier.update({ where: { id }, data: { isActive: false } });
}
