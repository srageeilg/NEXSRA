import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function listCategories(businessId: string) {
  return prisma.category.findMany({
    where: { businessId },
    include: { children: true, _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createCategory(businessId: string, data: { name: string; parentId?: string | null }) {
  return prisma.category.create({ data: { ...data, businessId } });
}

export async function updateCategory(businessId: string, id: string, data: { name?: string; parentId?: string | null }) {
  const category = await prisma.category.findFirst({ where: { id, businessId } });
  if (!category) throw ApiError.notFound("Category not found");
  return prisma.category.update({ where: { id }, data });
}

export async function deleteCategory(businessId: string, id: string) {
  const category = await prisma.category.findFirst({ where: { id, businessId } });
  if (!category) throw ApiError.notFound("Category not found");
  await prisma.category.delete({ where: { id } });
}

// ---------------------------------------------------------------------------
// Brands
// ---------------------------------------------------------------------------

export async function listBrands(businessId: string) {
  return prisma.brand.findMany({
    where: { businessId },
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });
}

export async function createBrand(businessId: string, data: { name: string }) {
  return prisma.brand.create({ data: { ...data, businessId } });
}

export async function updateBrand(businessId: string, id: string, data: { name?: string }) {
  const brand = await prisma.brand.findFirst({ where: { id, businessId } });
  if (!brand) throw ApiError.notFound("Brand not found");
  return prisma.brand.update({ where: { id }, data });
}

export async function deleteBrand(businessId: string, id: string) {
  const brand = await prisma.brand.findFirst({ where: { id, businessId } });
  if (!brand) throw ApiError.notFound("Brand not found");
  await prisma.brand.delete({ where: { id } });
}

// ---------------------------------------------------------------------------
// Units (global, shared across businesses)
// ---------------------------------------------------------------------------

export async function listUnits() {
  return prisma.unit.findMany({ orderBy: { name: "asc" } });
}

export async function createUnit(data: { name: string; shortCode: string }) {
  return prisma.unit.create({ data });
}
