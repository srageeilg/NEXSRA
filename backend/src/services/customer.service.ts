import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";

interface ListParams {
  search?: string;
  page: number;
  pageSize: number;
}

export async function listCustomers(businessId: string, params: ListParams) {
  const where: Prisma.CustomerWhereInput = {
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
    prisma.customer.findMany({
      where,
      include: {
        _count: { select: { salesOrders: true, invoices: true } },
        ledgerEntries: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { name: "asc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.customer.count({ where }),
  ]);

  const withBalance = items.map((c) => ({
    ...c,
    outstandingBalance: c.ledgerEntries[0]?.balance ?? c.openingBalance,
  }));

  return {
    items: withBalance,
    pagination: { page: params.page, pageSize: params.pageSize, total, totalPages: Math.ceil(total / params.pageSize) },
  };
}

export async function getCustomerById(businessId: string, id: string) {
  const customer = await prisma.customer.findFirst({
    where: { id, businessId },
    include: {
      invoices: { orderBy: { createdAt: "desc" }, take: 20 },
      ledgerEntries: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!customer) throw ApiError.notFound("Customer not found");
  return customer;
}

interface CustomerInput {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  creditLimit?: number;
  openingBalance?: number;
}

export async function createCustomer(businessId: string, data: CustomerInput) {
  return prisma.customer.create({ data: { ...data, businessId } });
}

export async function updateCustomer(businessId: string, id: string, data: Partial<CustomerInput>) {
  const customer = await prisma.customer.findFirst({ where: { id, businessId } });
  if (!customer) throw ApiError.notFound("Customer not found");
  return prisma.customer.update({ where: { id }, data });
}

export async function deactivateCustomer(businessId: string, id: string) {
  const customer = await prisma.customer.findFirst({ where: { id, businessId } });
  if (!customer) throw ApiError.notFound("Customer not found");
  await prisma.customer.update({ where: { id }, data: { isActive: false } });
}
