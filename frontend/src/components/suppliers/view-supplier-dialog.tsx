"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Supplier } from "@/hooks/use-suppliers";
import { formatCurrency } from "@/lib/utils";

interface Props {
  supplier: Supplier | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="min-w-36 text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium">{value ?? "—"}</span>
    </div>
  );
}

export function ViewSupplierDialog({ supplier, open, onOpenChange }: Props) {
  if (!supplier) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Supplier details</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-lg">{supplier.name}</h2>
              {supplier.contactPerson && (
                <p className="text-sm text-muted-foreground">Contact: {supplier.contactPerson}</p>
              )}
            </div>
            <Badge variant={supplier.isActive ? "success" : "secondary"}>
              {supplier.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>

          <Separator />

          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Contact</p>
            <Row label="Email" value={supplier.email} />
            <Row label="Phone" value={supplier.phone} />
            <Row label="Address" value={supplier.address} />
          </div>

          <Separator />

          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Financials</p>
            <Row label="Outstanding balance" value={
              <span className={parseFloat(supplier.outstandingBalance) > 0 ? "text-warning" : ""}>
                {formatCurrency(parseFloat(supplier.outstandingBalance))}
              </span>
            } />
          </div>

          <Separator />

          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Activity</p>
            <Row label="Purchase orders" value={supplier._count.purchaseOrders} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
