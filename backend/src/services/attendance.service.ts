import dayjs from "dayjs";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";

function todayDate(): Date {
  return dayjs().startOf("day").toDate();
}

export async function checkIn(businessId: string, employeeId: string) {
  const employee = await prisma.employee.findFirst({ where: { id: employeeId, businessId } });
  if (!employee) throw ApiError.notFound("Employee not found");

  const date = todayDate();
  const existing = await prisma.attendance.findUnique({ where: { employeeId_date: { employeeId, date } } });
  if (existing?.checkIn) throw ApiError.conflict("Employee has already checked in today");

  return prisma.attendance.upsert({
    where: { employeeId_date: { employeeId, date } },
    update: { checkIn: new Date(), status: "PRESENT" },
    create: { employeeId, date, checkIn: new Date(), status: "PRESENT" },
  });
}

export async function checkOut(businessId: string, employeeId: string) {
  const employee = await prisma.employee.findFirst({ where: { id: employeeId, businessId } });
  if (!employee) throw ApiError.notFound("Employee not found");

  const date = todayDate();
  const existing = await prisma.attendance.findUnique({ where: { employeeId_date: { employeeId, date } } });
  if (!existing) throw ApiError.badRequest("Employee has not checked in today");

  return prisma.attendance.update({ where: { id: existing.id }, data: { checkOut: new Date() } });
}

export async function listAttendance(businessId: string, params: { employeeId?: string; date?: Date }) {
  return prisma.attendance.findMany({
    where: {
      employee: { businessId },
      ...(params.employeeId && { employeeId: params.employeeId }),
      ...(params.date && { date: params.date }),
    },
    include: { employee: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
    orderBy: { date: "desc" },
    take: 100,
  });
}
