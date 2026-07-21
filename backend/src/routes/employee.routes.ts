import { Router } from "express";
import { authenticate, requireBusiness, requirePermission } from "../middleware/auth";
import { validate } from "../middleware/validate";
import * as employeeController from "../controllers/employee.controller";
import {
  checkInSchema,
  checkOutSchema,
  createDepartmentSchema,
  createEmployeeSchema,
  createLeaveRequestSchema,
  createPerformanceNoteSchema,
  updateEmployeeSchema,
  updateLeaveStatusSchema,
} from "../validation/employee.validation";

const router = Router();

router.use(authenticate, requireBusiness);

router.get("/departments", requirePermission("departments.view"), employeeController.listDepartments);
router.post(
  "/departments",
  requirePermission("departments.create"),
  validate(createDepartmentSchema),
  employeeController.createDepartment,
);

router.get("/", requirePermission("employees.view"), employeeController.listEmployees);
router.post("/", requirePermission("employees.create"), validate(createEmployeeSchema), employeeController.createEmployee);
router.patch("/:id", requirePermission("employees.update"), validate(updateEmployeeSchema), employeeController.updateEmployee);
router.delete("/:id", requirePermission("employees.delete"), employeeController.deactivateEmployee);
router.post(
  "/performance-notes",
  requirePermission("employees.update"),
  validate(createPerformanceNoteSchema),
  employeeController.addPerformanceNote,
);

router.get("/attendance", requirePermission("employees.view"), employeeController.listAttendance);
router.post("/attendance/check-in", requirePermission("employees.update"), validate(checkInSchema), employeeController.checkIn);
router.post("/attendance/check-out", requirePermission("employees.update"), validate(checkOutSchema), employeeController.checkOut);

router.get("/leave-requests", requirePermission("employees.view"), employeeController.listLeaveRequests);
router.post(
  "/leave-requests",
  requirePermission("employees.update"),
  validate(createLeaveRequestSchema),
  employeeController.createLeaveRequest,
);
router.patch(
  "/leave-requests/:id/status",
  requirePermission("employees.approve"),
  validate(updateLeaveStatusSchema),
  employeeController.updateLeaveStatus,
);

export default router;
