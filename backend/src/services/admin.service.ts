import { BusinessStatus, SystemRole } from "@prisma/client";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";
import { createBusinessWithOwner, hashPassword } from "./auth.service";

export async function createBusiness(input: {
  businessName: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerEmail: string;
  ownerPassword: string;
  planName?: string;
  planExpiresAt?: Date | null;
}) {
  const existing = await prisma.user.findUnique({ where: { email: input.ownerEmail } });
  if (existing) throw ApiError.conflict("An account with this email already exists");

  const passwordHash = await hashPassword(input.ownerPassword);
  const result = await createBusinessWithOwner({
    businessName: input.businessName,
    ownerFirstName: input.ownerFirstName,
    ownerLastName: input.ownerLastName,
    ownerEmail: input.ownerEmail,
    passwordHash,
    status: "APPROVED",
    isEmailVerified: true,
    planName: input.planName ?? "TRIAL",
    planExpiresAt: input.planExpiresAt ?? null,
  });

  return { businessId: result.business.id, userId: result.user.id };
}

export async function updateBusinessPlan(id: string, data: { planName?: string; planExpiresAt?: Date | null }) {
  const business = await prisma.business.findUnique({ where: { id } });
  if (!business) throw ApiError.notFound("Business not found");
  return prisma.business.update({ where: { id }, data });
}

export async function resetUserPassword(id: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw ApiError.notFound("User not found");

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id }, data: { password: passwordHash } });
  await prisma.session.updateMany({ where: { userId: id, status: "ACTIVE" }, data: { status: "REVOKED" } });
}

export async function listBusinesses(status?: BusinessStatus) {
  return prisma.business.findMany({
    where: status ? { status } : undefined,
    include: { _count: { select: { users: true, products: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateBusinessStatus(id: string, status: BusinessStatus) {
  const business = await prisma.business.findUnique({ where: { id } });
  if (!business) throw ApiError.notFound("Business not found");

  return prisma.business.update({
    where: { id },
    data: { status, approvedAt: status === "APPROVED" ? new Date() : business.approvedAt },
  });
}

export async function listUsers(businessId?: string) {
  return prisma.user.findMany({
    where: businessId ? { businessId } : undefined,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      isEmailVerified: true,
      lastLoginAt: true,
      business: { select: { id: true, name: true } },
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateUser(id: string, data: { role?: SystemRole; isActive?: boolean }) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw ApiError.notFound("User not found");
  return prisma.user.update({ where: { id }, data });
}

export async function listAuditLogs(params: { businessId?: string; page: number; pageSize: number }) {
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: params.businessId ? { businessId: params.businessId } : undefined,
      include: { user: { select: { id: true, firstName: true, lastName: true } }, business: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.auditLog.count({ where: params.businessId ? { businessId: params.businessId } : undefined }),
  ]);

  return {
    items,
    pagination: { page: params.page, pageSize: params.pageSize, total, totalPages: Math.ceil(total / params.pageSize) },
  };
}

export async function getSystemStats() {
  const [totalBusinesses, pendingBusinesses, totalUsers, totalProducts] = await Promise.all([
    prisma.business.count(),
    prisma.business.count({ where: { status: "PENDING" } }),
    prisma.user.count(),
    prisma.product.count(),
  ]);

  return { totalBusinesses, pendingBusinesses, totalUsers, totalProducts };
}
