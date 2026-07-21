"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateEmployeeDialog } from "@/components/employees/create-employee-dialog";
import {
  useEmployees,
  useAttendance,
  useLeaveRequests,
  useCheckIn,
  useCheckOut,
  useUpdateLeaveStatus,
} from "@/hooks/use-employees";
import { formatDate } from "@/lib/utils";

export default function EmployeesPage() {
  const { data: employees, isLoading: employeesLoading } = useEmployees();
  const { data: attendance, isLoading: attendanceLoading } = useAttendance();
  const { data: leaveRequests, isLoading: leaveLoading } = useLeaveRequests();
  const checkIn = useCheckIn();
  const checkOut = useCheckOut();
  const updateLeaveStatus = useUpdateLeaveStatus();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
          <p className="text-sm text-muted-foreground">Staff directory, attendance and leave management.</p>
        </div>
        <CreateEmployeeDialog />
      </div>

      <Tabs defaultValue="directory">
        <TabsList>
          <TabsTrigger value="directory">Directory</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="leave">Leave requests</TabsTrigger>
        </TabsList>

        <TabsContent value="directory">
          <Card>
            <CardContent className="p-4">
              {employeesLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Designation</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-40" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                          No employees yet.
                        </TableCell>
                      </TableRow>
                    )}
                    {employees?.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium">
                          {e.firstName} {e.lastName}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{e.employeeCode}</TableCell>
                        <TableCell>{e.department?.name ?? "—"}</TableCell>
                        <TableCell>{e.designation ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant={e.isActive ? "success" : "secondary"}>{e.isActive ? "Active" : "Inactive"}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => checkIn.mutate(e.id)}>
                              Check in
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => checkOut.mutate(e.id)}>
                              Check out
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardContent className="p-4">
              {attendanceLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Check in</TableHead>
                      <TableHead>Check out</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                          No attendance recorded yet.
                        </TableCell>
                      </TableRow>
                    )}
                    {attendance?.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">
                          {a.employee.firstName} {a.employee.lastName}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(a.date)}</TableCell>
                        <TableCell>{a.checkIn ? new Date(a.checkIn).toLocaleTimeString() : "—"}</TableCell>
                        <TableCell>{a.checkOut ? new Date(a.checkOut).toLocaleTimeString() : "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{a.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leave">
          <Card>
            <CardContent className="p-4">
              {leaveLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-40" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaveRequests?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                          No leave requests yet.
                        </TableCell>
                      </TableRow>
                    )}
                    {leaveRequests?.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium">
                          {l.employee.firstName} {l.employee.lastName}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(l.startDate)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(l.endDate)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{l.reason ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant={l.status === "APPROVED" ? "success" : l.status === "REJECTED" ? "destructive" : "warning"}>
                            {l.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {l.status === "PENDING" && (
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => updateLeaveStatus.mutate({ id: l.id, status: "APPROVED" })}>
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => updateLeaveStatus.mutate({ id: l.id, status: "REJECTED" })}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
