"use client";

import { Building2, Users, Package, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/store/auth-store";
import {
  useSystemStats,
  useAdminBusinesses,
  useUpdateBusinessStatus,
  useAdminUsers,
  useUpdateAdminUser,
  useAuditLogs,
} from "@/hooks/use-admin";
import { formatDate } from "@/lib/utils";

const BUSINESS_STATUS_VARIANT: Record<string, "success" | "destructive" | "warning" | "secondary"> = {
  APPROVED: "success",
  PENDING: "warning",
  SUSPENDED: "destructive",
  REJECTED: "destructive",
};

export default function AdminPage() {
  const user = useAuthStore((s) => s.user);
  const stats = useSystemStats();
  const businesses = useAdminBusinesses();
  const updateBusinessStatus = useUpdateBusinessStatus();
  const users = useAdminUsers();
  const updateUser = useUpdateAdminUser();
  const auditLogs = useAuditLogs();

  if (user && user.role !== "SUPER_ADMIN") {
    return (
      <Card>
        <CardContent className="py-16 text-center text-sm text-muted-foreground">
          The admin panel is only available to super administrators.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin panel</h1>
        <p className="text-sm text-muted-foreground">Business approvals, user management, and system audit logs.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Building2 className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Businesses</p>
              <p className="text-xl font-semibold">{stats.data?.totalBusinesses ?? "—"}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Clock className="h-5 w-5 text-warning" />
            <div>
              <p className="text-xs text-muted-foreground">Pending approval</p>
              <p className="text-xl font-semibold">{stats.data?.pendingBusinesses ?? "—"}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Total users</p>
              <p className="text-xl font-semibold">{stats.data?.totalUsers ?? "—"}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Package className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Total products</p>
              <p className="text-xl font-semibold">{stats.data?.totalProducts ?? "—"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="businesses">
        <TabsList>
          <TabsTrigger value="businesses">Businesses</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="audit">Audit logs</TabsTrigger>
        </TabsList>

        <TabsContent value="businesses">
          <Card>
            <CardContent className="p-4">
              {businesses.isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business</TableHead>
                      <TableHead>Users</TableHead>
                      <TableHead>Products</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-56" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {businesses.data?.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell>
                          <p className="font-medium">{b.name}</p>
                          <p className="text-xs text-muted-foreground">{b.email}</p>
                        </TableCell>
                        <TableCell>{b._count.users}</TableCell>
                        <TableCell>{b._count.products}</TableCell>
                        <TableCell>
                          <Badge variant={BUSINESS_STATUS_VARIANT[b.status]}>{b.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {b.status !== "APPROVED" && (
                              <Button size="sm" variant="outline" onClick={() => updateBusinessStatus.mutate({ id: b.id, status: "APPROVED" })}>
                                Approve
                              </Button>
                            )}
                            {b.status !== "SUSPENDED" && (
                              <Button size="sm" variant="ghost" onClick={() => updateBusinessStatus.mutate({ id: b.id, status: "SUSPENDED" })}>
                                Suspend
                              </Button>
                            )}
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

        <TabsContent value="users">
          <Card>
            <CardContent className="p-4">
              {users.isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Business</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-32" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.data?.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <p className="font-medium">
                            {u.firstName} {u.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </TableCell>
                        <TableCell>{u.business?.name ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{u.role.replace(/_/g, " ")}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.isActive ? "success" : "destructive"}>{u.isActive ? "Active" : "Disabled"}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateUser.mutate({ id: u.id, isActive: !u.isActive })}
                          >
                            {u.isActive ? "Disable" : "Enable"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit">
          <Card>
            <CardContent className="p-4">
              {auditLogs.isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Business</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.data?.data.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                          No audit log entries yet.
                        </TableCell>
                      </TableRow>
                    )}
                    {auditLogs.data?.data.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.action}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{log.entityType ?? "—"}</TableCell>
                        <TableCell>{log.user ? `${log.user.firstName} ${log.user.lastName}` : "System"}</TableCell>
                        <TableCell>{log.business?.name ?? "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(log.createdAt)}</TableCell>
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
