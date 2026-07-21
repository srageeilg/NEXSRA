"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StockActionDialog } from "@/components/inventory/stock-action-dialog";
import { useStock, useMovements } from "@/hooks/use-inventory";
import { formatDate } from "@/lib/utils";

const MOVEMENT_BADGE: Record<string, "success" | "destructive" | "warning" | "secondary" | "default"> = {
  STOCK_IN: "success",
  PURCHASE: "success",
  RETURNED: "success",
  STOCK_OUT: "secondary",
  SALE: "secondary",
  TRANSFER: "default",
  ADJUSTMENT: "warning",
  DAMAGED: "destructive",
  SALE_RETURN: "warning",
  PURCHASE_RETURN: "warning",
};

export default function InventoryPage() {
  const { data: stockData, isLoading: stockLoading } = useStock({ pageSize: 50 });
  const { data: movementsData, isLoading: movementsLoading } = useMovements({ pageSize: 50 });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
          <p className="text-sm text-muted-foreground">Stock levels, transfers, adjustments and movement history.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StockActionDialog mode="stock-in" />
          <StockActionDialog mode="stock-out" />
          <StockActionDialog mode="transfer" />
          <StockActionDialog mode="adjustment" />
          <StockActionDialog mode="damaged" />
          <StockActionDialog mode="returned" />
        </div>
      </div>

      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock">Stock levels</TabsTrigger>
          <TabsTrigger value="history">Movement history</TabsTrigger>
        </TabsList>

        <TabsContent value="stock">
          <Card>
            <CardContent className="p-4">
              {stockLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Warehouse</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Reserved</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockData?.data.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                          No stock recorded yet. Use "Stock in" to add inventory.
                        </TableCell>
                      </TableRow>
                    )}
                    {stockData?.data.map((row) => {
                      const isLow = row.quantity <= row.product.lowStockThreshold;
                      return (
                        <TableRow key={row.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{row.product.name}</p>
                              <p className="font-mono text-xs text-muted-foreground">{row.product.sku}</p>
                            </div>
                          </TableCell>
                          <TableCell>{row.warehouse.name}</TableCell>
                          <TableCell className="font-medium">{row.quantity}</TableCell>
                          <TableCell>{row.reservedQty}</TableCell>
                          <TableCell>
                            <Badge variant={row.quantity === 0 ? "destructive" : isLow ? "warning" : "success"}>
                              {row.quantity === 0 ? "Out of stock" : isLow ? "Low stock" : "In stock"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatDate(row.updatedAt)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="p-4">
              {movementsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>By</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movementsData?.data.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                          No stock movements recorded yet.
                        </TableCell>
                      </TableRow>
                    )}
                    {movementsData?.data.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell>
                          <Badge variant={MOVEMENT_BADGE[m.type] ?? "default"}>{m.type.replace(/_/g, " ")}</Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{m.product.name}</p>
                            <p className="font-mono text-xs text-muted-foreground">{m.product.sku}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium tabular-nums">{m.quantity}</TableCell>
                        <TableCell>{m.fromWarehouse?.name ?? "—"}</TableCell>
                        <TableCell>{m.toWarehouse?.name ?? "—"}</TableCell>
                        <TableCell>{m.performedBy ? `${m.performedBy.firstName} ${m.performedBy.lastName}` : "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(m.createdAt)}</TableCell>
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
