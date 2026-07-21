import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";

export async function createLeaveRequest(
  businessId: string,
  data: { employeeId: string; startDate: Date; endDate: Date; reason?: string },
) {
  const employee = await prisma.employee.findFirst({ where: { id: data.employeeId, businessId } });
  if (!employee) throw ApiError.notFound("Employee not found");
  return prisma.leaveRequest.create({ data });
}

export async function listLeaveRequests(businessId: string, params: { employeeId?: string }) {
  return prisma.leaveRequest.findMany({
    where: { employee: { businessId }, ...(params.employeeId && { employeeId: params.employeeId }) },
    include: { employee: { select: { id: true, firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function updateLeaveStatus(businessId: string, id: string, status: "APPROVED" | "REJECTED") {
  const leave = await prisma.leaveRequest.findFirst({ where: { id, employee: { businessId } } });
  if (!leave) throw ApiError.notFound("Leave request not found");
  return prisma.leaveRequest.update({ where: { id }, data: { status } });
}
