import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";

export async function getBusinessProfile(businessId: string) {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) throw ApiError.notFound("Business not found");
  return business;
}

export async function updateBusinessProfile(businessId: string, data: Prisma.BusinessUpdateInput) {
  return prisma.business.update({ where: { id: businessId }, data });
}

export async function getSettings(businessId: string) {
  const settings = await prisma.setting.findMany({ where: { businessId } });
  return Object.fromEntries(settings.map((s) => [s.key, s.value]));
}

export async function upsertSetting(businessId: string, key: string, value: Prisma.InputJsonValue) {
  return prisma.setting.upsert({
    where: { businessId_key: { businessId, key } },
    update: { value },
    create: { businessId, key, value },
  });
}

export async function listRoleDefinitions(businessId: string) {
  return prisma.roleDefinition.findMany({
    where: { businessId },
    include: { permissions: true, _count: { select: { users: true } } },
    orderBy: { name: "asc" },
  });
}

export async function updateRolePermissions(businessId: string, roleId: string, permissionKeys: string[]) {
  const role = await prisma.roleDefinition.findFirst({ where: { id: roleId, businessId } });
  if (!role) throw ApiError.notFound("Role not found");

  return prisma.roleDefinition.update({
    where: { id: roleId },
    data: { permissions: { set: permissionKeys.map((key) => ({ key })) } },
    include: { permissions: true },
  });
}

export async function listAllPermissions() {
  return prisma.permission.findMany({ orderBy: [{ module: "asc" }, { action: "asc" }] });
}
