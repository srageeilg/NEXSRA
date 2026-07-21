import { PrismaClient, SystemRole, BusinessStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ALL_PERMISSIONS } from "../src/config/permissions";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding permissions...");
  await prisma.permission.createMany({ data: ALL_PERMISSIONS, skipDuplicates: true });

  console.log("Seeding units...");
  await prisma.unit.createMany({
    data: [
      { name: "Piece", shortCode: "pcs" },
      { name: "Kilogram", shortCode: "kg" },
      { name: "Liter", shortCode: "ltr" },
      { name: "Box", shortCode: "box" },
      { name: "Meter", shortCode: "m" },
    ],
    skipDuplicates: true,
  });

  console.log("Seeding demo business...");
  let business = await prisma.business.findUnique({ where: { slug: "nexsra-demo" } });
  if (!business) {
    business = await prisma.business.create({
      data: {
        name: "NEXSRA Demo",
        slug: "nexsra-demo",
        email: "demo@nexsra.local",
        currency: "USD",
        timezone: "UTC",
        status: BusinessStatus.ACTIVE,
        approvedAt: new Date(),
      },
    });
    console.log("Created demo business: NEXSRA Demo");
  }

  console.log("Seeding super admin...");
  const email = "superadmin@nexsra.local";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    await prisma.user.create({
      data: {
        email,
        password: await bcrypt.hash("SuperAdmin@123", 12),
        firstName: "Super",
        lastName: "Admin",
        role: SystemRole.SUPER_ADMIN,
        isEmailVerified: true,
        businessId: business.id,
      },
    });
    console.log(`Created super admin: ${email} / SuperAdmin@123 (change this immediately)`);
  } else if (!existing.businessId) {
    await prisma.user.update({
      where: { email },
      data: { businessId: business.id },
    });
    console.log("Linked super admin to demo business");
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
