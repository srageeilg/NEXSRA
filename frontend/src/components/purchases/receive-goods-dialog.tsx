"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useReceiveGoods, type PurchaseOrder } from "@/hooks/use-purchases";

interface FormValues {
  [itemId: string]: string;
}

export function ReceiveGoodsDialog({ purchaseOrder }: { purchaseOrder: PurchaseOrder }) {
  const [open, setOpen] = useState(false);
  const receiveGoods = useReceiveGoods();
  const { register, handleSubmit, reset } = useForm<FormValues>();

  const pendingItems = purchaseOrder.items.filter((i) => i.quantityReceived < i.quantityOrdered);

  const onSubmit = (values: FormValues) => {
    const items = pendingItems
      .map((item) => ({ itemId: item.id, quantityReceived: Number(values[item.id] ?? 0) }))
      .filter((i) => i.quantityReceived > 0);

    if (items.length === 0) return;

    receiveGoods.mutate(
      { id: purchaseOrder.id, items },
      {
        onSuccess: () => {
          setOpen(false);
          reset();
        },
      },
    );
  };

  if (pendingItems.length === 0) {
    return (
      <Button variant="outline" size="sm" disabled>
        Fully received
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Receive goods
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Receive goods — {purchaseOrder.poNumber}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {pendingItems.map((item) => {
            const remaining = item.quantityOrdered - item.quantityReceived;
            return (
              <div key={item.id} className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Item</p>
                  <p className="text-xs text-muted-foreground">
                    Ordered {item.quantityOrdered}, received {item.quantityReceived}, remaining {remaining}
                  </p>
                </div>
                <div className="w-28 space-y-1">
                  <Label className="sr-only">Quantity to receive</Label>
                  <Input type="number" min={0} max={remaining} placeholder="0" {...register(item.id)} />
                </div>
              </div>
            );
          })}
          <DialogFooter>
            <Button type="submit" disabled={receiveGoods.isPending}>
              {receiveGoods.isPending ? "Receiving..." : "Confirm receipt"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
