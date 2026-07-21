"use client";

import { AlertTriangle, PackageX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StockItem {
  id: string;
  name: string;
  sku: string;
  currentQty: number;
  threshold: number;
}

interface StockAlertsProps {
  items: StockItem[];
  outOfStockCount: number;
}

export function StockAlerts({ items, outOfStockCount }: StockAlertsProps) {
  if (items.length === 0 && outOfStockCount === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Stock Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground py-4 text-center">All stock levels are healthy</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <AlertTriangle className="h-4 w-4 text-warning" />
          Stock Alerts
          <Badge variant="destructive" className="ml-auto text-xs">
            {items.length + outOfStockCount}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-80 overflow-y-auto">
        {outOfStockCount > 0 && items.length === 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5">
            <PackageX className="h-4 w-4 shrink-0 text-destructive" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-destructive">{outOfStockCount} products out of stock</p>
              <p className="text-xs text-muted-foreground">Check inventory for details</p>
            </div>
          </div>
        )}
        {items.map((item) => {
          const pct = Math.round((item.currentQty / item.threshold) * 100);
          const isOut = item.currentQty === 0;
          return (
            <div
              key={item.id}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${
                isOut
                  ? "border-destructive/20 bg-destructive/5"
                  : "border-warning/20 bg-warning/5"
              }`}
            >
              {isOut ? (
                <PackageX className="h-4 w-4 shrink-0 text-destructive" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  SKU: {item.sku} · {item.currentQty} left
                </p>
              </div>
              <Badge
                variant={isOut ? "destructive" : "outline"}
                className={`shrink-0 text-xs ${!isOut ? "border-warning text-warning" : ""}`}
              >
                {isOut ? "Out" : `${pct}%`}
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
