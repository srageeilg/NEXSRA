import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import * as employeeService from "../services/employee.service";
import * as attendanceService from "../services/attendance.service";
import * as leaveService from "../services/leave.service";

export const listDepartments = asyncHandler(async (req: Request, res: Response) => {
  const departments = await employeeService.listDepartments(req.user!.businessId!);
  res.json({ success: true, data: departments });
});

export const createDepartment = asyncHandler(async (req: Request, res: Response) => {
  const department = await employeeService.createDepartment(req.user!.businessId!, req.body);
  res.status(201).json({ success: true, data: department });
});

export const listEmployees = asyncHandler(async (req: Request, res: Response) => {
  const employees = await employeeService.listEmployees(req.user!.businessId!);
  res.json({ success: true, data: employees });
});

export const createEmployee = asyncHandler(async (req: Request, res: Response) => {
  const employee = await employeeService.createEmployee(req.user!.businessId!, req.body);
  res.status(201).json({ success: true, data: employee });
});

export const updateEmployee = asyncHandler(async (req: Request, res: Response) => {
  const employee = await employeeService.updateEmployee(req.user!.businessId!, req.params.id, req.body);
  res.json({ success: true, data: employee });
});

export const deactivateEmployee = asyncHandler(async (req: Request, res: Response) => {
  await employeeService.deactivateEmployee(req.user!.businessId!, req.params.id);
  res.json({ success: true, message: "Employee deactivated" });
});

export const addPerformanceNote = asyncHandler(async (req: Request, res: Response) => {
  const note = await employeeService.addPerformanceNote(req.user!.businessId!, req.body);
  res.status(201).json({ success: true, data: note });
});

export const checkIn = asyncHandler(async (req: Request, res: Response) => {
  const attendance = await attendanceService.checkIn(req.user!.businessId!, req.body.employeeId);
  res.status(201).json({ success: true, data: attendance });
});

export const checkOut = asyncHandler(async (req: Request, res: Response) => {
  const attendance = await attendanceService.checkOut(req.user!.businessId!, req.body.employeeId);
  res.json({ success: true, data: attendance });
});

export const listAttendance = asyncHandler(async (req: Request, res: Response) => {
  const attendance = await attendanceService.listAttendance(req.user!.businessId!, req.query as never);
  res.json({ success: true, data: attendance });
});

export const createLeaveRequest = asyncHandler(async (req: Request, res: Response) => {
  const leave = await leaveService.createLeaveRequest(req.user!.businessId!, req.body);
  res.status(201).json({ success: true, data: leave });
});

export const listLeaveRequests = asyncHandler(async (req: Request, res: Response) => {
  const leaves = await leaveService.listLeaveRequests(req.user!.businessId!, req.query as never);
  res.json({ success: true, data: leaves });
});

export const updateLeaveStatus = asyncHandler(async (req: Request, res: Response) => {
  const leave = await leaveService.updateLeaveStatus(req.user!.businessId!, req.params.id, req.body.status);
  res.json({ success: true, data: leave });
});
