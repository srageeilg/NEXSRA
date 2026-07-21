"use client";

import { Warehouse } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateWarehouseDialog } from "@/components/warehouses/create-warehouse-dialog";
import { EditWarehouseDialog } from "@/components/warehouses/edit-warehouse-dialog";
import { useWarehouses } from "@/hooks/use-warehouses";

export default function WarehousesPage() {
  const { data: warehouses, isLoading } = useWarehouses();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Warehouses</h1>
          <p className="text-sm text-muted-foreground">Manage the physical locations that hold your stock.</p>
        </div>
        <CreateWarehouseDialog />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : warehouses?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
            <Warehouse className="h-8 w-8" />
            <p>No warehouses yet. Create your first one to start tracking stock.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {warehouses?.map((w) => (
            <Card key={w.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Warehouse className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={w.isActive ? "success" : "secondary"}>{w.isActive ? "Active" : "Inactive"}</Badge>
                    <EditWarehouseDialog warehouse={w} />
                  </div>
                </div>
                <div>
                  <p className="font-semibold">{w.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">{w.code}</p>
                </div>
                {w.address && <p className="text-sm text-muted-foreground">{w.address}</p>}
                <p className="text-xs text-muted-foreground">{w._count.stocks} stock entries</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
