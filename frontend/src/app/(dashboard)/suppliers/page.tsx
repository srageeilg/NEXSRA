"use client";

import { useState } from "react";
import { Search, MoreHorizontal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateSupplierDialog } from "@/components/suppliers/create-supplier-dialog";
import { EditSupplierDialog } from "@/components/suppliers/edit-supplier-dialog";
import { ViewSupplierDialog } from "@/components/suppliers/view-supplier-dialog";
import { useSuppliers, useDeactivateSupplier, Supplier } from "@/hooks/use-suppliers";
import { formatCurrency } from "@/lib/utils";

export default function SuppliersPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useSuppliers({ pageSize: 20, search: search || undefined });
  const deactivate = useDeactivateSupplier();

  const [viewSupplier, setViewSupplier] = useState<Supplier | null>(null);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Suppliers</h1>
          <p className="text-sm text-muted-foreground">Vendors you purchase inventory from, and what you owe them.</p>
        </div>
        <CreateSupplierDialog />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative mb-4 max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search suppliers..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Purchase orders</TableHead>
                  <TableHead>Outstanding</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                      No suppliers yet.
                    </TableCell>
                  </TableRow>
                )}
                {data?.data.map((s) => (
                  <TableRow key={s.id} className="cursor-pointer" onClick={() => setViewSupplier(s)}>
                    <TableCell>
                      <p className="font-medium">{s.name}</p>
                      {s.contactPerson && <p className="text-xs text-muted-foreground">{s.contactPerson}</p>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{s.phone ?? s.email ?? "—"}</TableCell>
                    <TableCell>{s._count.purchaseOrders}</TableCell>
                    <TableCell>
                      <span className={parseFloat(s.outstandingBalance) > 0 ? "font-medium text-warning" : "font-medium"}>
                        {formatCurrency(s.outstandingBalance)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.isActive ? "success" : "secondary"}>{s.isActive ? "Active" : "Inactive"}</Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewSupplier(s)}>View details</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditSupplier(s)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => deactivate.mutate(s.id)}
                          >
                            Deactivate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ViewSupplierDialog
        supplier={viewSupplier}
        open={!!viewSupplier}
        onOpenChange={(o) => { if (!o) setViewSupplier(null); }}
      />

      {editSupplier && (
        <EditSupplierDialog
          supplier={editSupplier}
          open={!!editSupplier}
          onOpenChange={(o) => { if (!o) setEditSupplier(null); }}
        />
      )}
    </div>
  );
}
