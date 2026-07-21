"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAllPermissions, useRoleDefinitions, useUpdateRolePermissions } from "@/hooks/use-settings";
import { cn } from "@/lib/utils";

export function RolePermissionsEditor() {
  const { data: roles, isLoading: rolesLoading } = useRoleDefinitions();
  const { data: permissions, isLoading: permissionsLoading } = useAllPermissions();
  const updateRolePermissions = useUpdateRolePermissions();

  const [selectedRoleId, setSelectedRoleId] = useState<string>();
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (roles && roles.length > 0 && !selectedRoleId) {
      setSelectedRoleId(roles[0].id);
    }
  }, [roles, selectedRoleId]);

  useEffect(() => {
    const role = roles?.find((r) => r.id === selectedRoleId);
    setSelectedKeys(new Set(role?.permissions.map((p) => p.key) ?? []));
  }, [selectedRoleId, roles]);

  if (rolesLoading || permissionsLoading) return <Skeleton className="h-96 w-full" />;

  const grouped = new Map<string, typeof permissions>();
  permissions?.forEach((p) => {
    if (!grouped.has(p.module)) grouped.set(p.module, []);
    grouped.get(p.module)!.push(p);
  });

  const toggle = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Roles &amp; permissions</CardTitle>
        <div className="w-56">
          <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
            <SelectTrigger>
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              {roles?.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {Array.from(grouped.entries()).map(([module, perms]) => (
          <div key={module}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{module}</p>
            <div className="flex flex-wrap gap-2">
              {perms?.map((p) => {
                const active = selectedKeys.has(p.key);
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => toggle(p.key)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      active ? "border-primary bg-primary/10 text-primary" : "border-input text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {p.action}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <Button
          disabled={!selectedRoleId || updateRolePermissions.isPending}
          onClick={() =>
            selectedRoleId && updateRolePermissions.mutate({ roleId: selectedRoleId, permissionKeys: Array.from(selectedKeys) })
          }
        >
          {updateRolePermissions.isPending ? "Saving..." : "Save permissions"}
        </Button>
      </CardContent>
    </Card>
  );
}
