"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreatePurchaseOrderDialog } from "@/components/purchases/create-purchase-order-dialog";
import { ReceiveGoodsDialog } from "@/components/purchases/receive-goods-dialog";
import { usePurchaseOrders } from "@/hooks/use-purchases";
import { formatCurrency, formatDate } from "@/lib/utils";

const STATUS_VARIANT: Record<string, "success" | "destructive" | "warning" | "secondary" | "default"> = {
  RECEIVED: "success",
  PARTIALLY_RECEIVED: "warning",
  ORDERED: "default",
  DRAFT: "secondary",
  CANCELLED: "destructive",
};

export default function PurchasesPage() {
  const { data, isLoading } = usePurchaseOrders({ pageSize: 30 });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Purchases</h1>
          <p className="text-sm text-muted-foreground">Purchase orders, receiving, and supplier stock intake.</p>
        </div>
        <CreatePurchaseOrderDialog />
      </div>

      <Card>
        <CardContent className="p-4">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-40" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      No purchase orders yet.
                    </TableCell>
                  </TableRow>
                )}
                {data?.data.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-mono text-sm">{po.poNumber}</TableCell>
                    <TableCell>{po.supplier.name}</TableCell>
                    <TableCell>{po.warehouse.name}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(po.grandTotal)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[po.status] ?? "default"}>{po.status.replace(/_/g, " ")}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(po.createdAt)}</TableCell>
                    <TableCell>
                      <ReceiveGoodsDialog purchaseOrder={po} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
