"use client";

import { ImageOff } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Product } from "@/hooks/use-products";
import { formatCurrency } from "@/lib/utils";

interface Props {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="min-w-32 text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value ?? "—"}</span>
    </div>
  );
}

export function ViewProductSheet({ product, open, onOpenChange }: Props) {
  if (!product) return null;

  const primaryImage = product.images.find((i) => i.isPrimary) ?? product.images[0];

  const stockVariant =
    product.totalStock === 0
      ? ("destructive" as const)
      : product.totalStock <= product.lowStockThreshold
        ? ("warning" as const)
        : ("success" as const);

  const stockLabel =
    product.totalStock === 0
      ? "Out of stock"
      : product.totalStock <= product.lowStockThreshold
        ? "Low stock"
        : "In stock";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Product details</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted">
              {primaryImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={primaryImage.url} alt={product.name} className="h-full w-full object-cover" />
              ) : (
                <ImageOff className="h-6 w-6 text-muted-foreground" />
              )}
            </div>
            <div>
              <h2 className="font-semibold">{product.name}</h2>
              <p className="font-mono text-xs text-muted-foreground">{product.sku}</p>
              <div className="mt-1.5 flex gap-1.5">
                <Badge variant={product.isActive ? "success" : "secondary"}>
                  {product.isActive ? "Active" : "Inactive"}
                </Badge>
                <Badge variant={stockVariant}>
                  {product.totalStock} {stockLabel}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Catalog</p>
            <Row label="Category" value={product.category?.name} />
            <Row label="Brand" value={product.brand?.name} />
            <Row label="Unit" value={product.unit?.name} />
          </div>

          <Separator />

          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pricing</p>
            <Row label="Purchase price" value={formatCurrency(parseFloat(product.purchasePrice))} />
            <Row label="Selling price" value={formatCurrency(parseFloat(product.sellingPrice))} />
            <Row
              label="Margin"
              value={(() => {
                const buy = parseFloat(product.purchasePrice);
                const sell = parseFloat(product.sellingPrice);
                if (!buy || !sell) return "—";
                const pct = ((sell - buy) / buy) * 100;
                return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
              })()}
            />
          </div>

          <Separator />

          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Stock</p>
            <Row label="Total stock" value={product.totalStock} />
            <Row label="Low stock alert" value={`≤ ${product.lowStockThreshold} units`} />
            {product.barcode && (
              <Row label="Barcode" value={<span className="font-mono text-xs">{product.barcode}</span>} />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
