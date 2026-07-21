"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, ApiResponse } from "@/lib/api-client";

export interface Department {
  id: string;
  name: string;
  _count: { employees: number };
}

export interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  designation: string | null;
  isActive: boolean;
  department?: { id: string; name: string } | null;
}

export interface Attendance {
  id: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  employee: { id: string; firstName: string; lastName: string; employeeCode: string };
}

export interface LeaveRequest {
  id: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  employee: { id: string; firstName: string; lastName: string };
}

export function useDepartments() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: async () => (await apiClient.get<ApiResponse<Department[]>>("/employees/departments")).data.data,
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string }) =>
      (await apiClient.post<ApiResponse<Department>>("/employees/departments", input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["departments"] });
      toast.success("Department created");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to create department"),
  });
}

export function useEmployees() {
  return useQuery({
    queryKey: ["employees"],
    queryFn: async () => (await apiClient.get<ApiResponse<Employee[]>>("/employees")).data.data,
  });
}

export interface CreateEmployeeInput {
  employeeCode: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  designation?: string;
  departmentId?: string;
}

export function useCreateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateEmployeeInput) => (await apiClient.post<ApiResponse<Employee>>("/employees", input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee added");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to add employee"),
  });
}

export function useAttendance() {
  return useQuery({
    queryKey: ["attendance"],
    queryFn: async () => (await apiClient.get<ApiResponse<Attendance[]>>("/employees/attendance")).data.data,
  });
}

function useAttendanceMutation(endpoint: "check-in" | "check-out", message: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (employeeId: string) =>
      (await apiClient.post<ApiResponse<Attendance>>(`/employees/attendance/${endpoint}`, { employeeId })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
      toast.success(message);
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Operation failed"),
  });
}

export const useCheckIn = () => useAttendanceMutation("check-in", "Checked in");
export const useCheckOut = () => useAttendanceMutation("check-out", "Checked out");

export function useLeaveRequests() {
  return useQuery({
    queryKey: ["leave-requests"],
    queryFn: async () => (await apiClient.get<ApiResponse<LeaveRequest[]>>("/employees/leave-requests")).data.data,
  });
}

export function useCreateLeaveRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { employeeId: string; startDate: string; endDate: string; reason?: string }) =>
      (await apiClient.post<ApiResponse<LeaveRequest>>("/employees/leave-requests", input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      toast.success("Leave request submitted");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to submit leave request"),
  });
}

export function useUpdateLeaveStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "APPROVED" | "REJECTED" }) =>
      (await apiClient.patch<ApiResponse<LeaveRequest>>(`/employees/leave-requests/${id}/status`, { status })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-requests"] });
      toast.success("Leave request updated");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to update leave request"),
  });
}
