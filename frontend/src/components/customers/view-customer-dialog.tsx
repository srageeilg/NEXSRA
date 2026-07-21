"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Customer } from "@/hooks/use-customers";
import { formatCurrency } from "@/lib/utils";

interface Props {
  customer: Customer | null;
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

export function ViewCustomerDialog({ customer, open, onOpenChange }: Props) {
  if (!customer) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Customer details</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-lg">{customer.name}</h2>
              <p className="text-sm text-muted-foreground">{customer.email ?? customer.phone ?? "No contact info"}</p>
            </div>
            <Badge variant={customer.isActive ? "success" : "secondary"}>
              {customer.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>

          <Separator />

          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Contact</p>
            <Row label="Email" value={customer.email} />
            <Row label="Phone" value={customer.phone} />
            <Row label="Address" value={customer.address} />
          </div>

          <Separator />

          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Financials</p>
            <Row label="Credit limit" value={formatCurrency(parseFloat(customer.creditLimit))} />
            <Row label="Outstanding balance" value={
              <span className={parseFloat(customer.outstandingBalance) > 0 ? "text-destructive" : ""}>
                {formatCurrency(parseFloat(customer.outstandingBalance))}
              </span>
            } />
            <Row label="Loyalty points" value={customer.loyaltyPoints} />
          </div>

          <Separator />

          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Activity</p>
            <Row label="Sales orders" value={customer._count.salesOrders} />
            <Row label="Invoices" value={customer._count.invoices} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
