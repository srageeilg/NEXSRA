"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProducts } from "@/hooks/use-products";
import { useWarehouses } from "@/hooks/use-warehouses";
import {
  useStockIn,
  useStockOut,
  useTransferStock,
  useAdjustStock,
  useMarkDamaged,
  useMarkReturned,
} from "@/hooks/use-inventory";

type Mode = "stock-in" | "stock-out" | "transfer" | "adjustment" | "damaged" | "returned";

const MODE_CONFIG: Record<Mode, { title: string; triggerLabel: string; triggerVariant: "default" | "outline" | "destructive" }> = {
  "stock-in": { title: "Stock in", triggerLabel: "Stock in", triggerVariant: "default" },
  "stock-out": { title: "Stock out", triggerLabel: "Stock out", triggerVariant: "outline" },
  transfer: { title: "Transfer between warehouses", triggerLabel: "Transfer", triggerVariant: "outline" },
  adjustment: { title: "Inventory adjustment", triggerLabel: "Adjust", triggerVariant: "outline" },
  damaged: { title: "Record damaged stock", triggerLabel: "Mark damaged", triggerVariant: "destructive" },
  returned: { title: "Record returned stock", triggerLabel: "Mark returned", triggerVariant: "outline" },
};

interface FormValues {
  productId: string;
  warehouseId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: string;
  newQuantity: string;
  unitCost: string;
  reason: string;
  reference: string;
}

export function StockActionDialog({ mode }: { mode: Mode }) {
  const [open, setOpen] = useState(false);
  const { data: productsData } = useProducts({ pageSize: 100 });
  const { data: warehouses } = useWarehouses();
  const config = MODE_CONFIG[mode];

  const stockIn = useStockIn();
  const stockOut = useStockOut();
  const transfer = useTransferStock();
  const adjustment = useAdjustStock();
  const damaged = useMarkDamaged();
  const returned = useMarkReturned();

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>();

  const isTransfer = mode === "transfer";
  const isAdjustment = mode === "adjustment";

  // Default to the business's primary warehouse so this doesn't need picking every time.
  useEffect(() => {
    if (open && warehouses && warehouses.length > 0) {
      if (isTransfer) {
        setValue("fromWarehouseId", warehouses[0].id);
      } else {
        setValue("warehouseId", warehouses[0].id);
      }
    }
  }, [open, warehouses, isTransfer, setValue]);

  const onSubmit = (values: FormValues) => {
    const onSuccess = () => {
      setOpen(false);
      reset();
    };

    if (isTransfer) {
      transfer.mutate(
        {
          productId: values.productId,
          fromWarehouseId: values.fromWarehouseId,
          toWarehouseId: values.toWarehouseId,
          quantity: Number(values.quantity),
          reason: values.reason || undefined,
          reference: values.reference || undefined,
        },
        { onSuccess },
      );
      return;
    }

    if (isAdjustment) {
      adjustment.mutate(
        {
          productId: values.productId,
          warehouseId: values.warehouseId,
          newQuantity: Number(values.newQuantity),
          reason: values.reason,
        },
        { onSuccess },
      );
      return;
    }

    const payload = {
      productId: values.productId,
      warehouseId: values.warehouseId,
      quantity: Number(values.quantity),
      reason: values.reason || undefined,
      reference: values.reference || undefined,
      ...(mode === "stock-in" ? { unitCost: values.unitCost ? Number(values.unitCost) : undefined } : {}),
    };

    const mutation = { "stock-in": stockIn, "stock-out": stockOut, damaged, returned }[mode as "stock-in" | "stock-out" | "damaged" | "returned"];
    mutation.mutate(payload, { onSuccess });
  };

  const isPending = stockIn.isPending || stockOut.isPending || transfer.isPending || adjustment.isPending || damaged.isPending || returned.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={config.triggerVariant}>{config.triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{config.title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Product</Label>
            <Controller
              control={control}
              name="productId"
              rules={{ required: true }}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {productsData?.data.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.productId && <p className="text-xs text-destructive">Please select a product.</p>}
          </div>

          {isTransfer ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>From warehouse</Label>
                <Controller
                  control={control}
                  name="fromWarehouseId"
                  rules={{ required: true }}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Source" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses?.map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.fromWarehouseId && <p className="text-xs text-destructive">Required.</p>}
              </div>
              <div className="space-y-2">
                <Label>To warehouse</Label>
                <Controller
                  control={control}
                  name="toWarehouseId"
                  rules={{ required: true }}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Destination" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses?.map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.toWarehouseId && <p className="text-xs text-destructive">Required.</p>}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Warehouse</Label>
              <Controller
                control={control}
                name="warehouseId"
                rules={{ required: true }}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                      {warehouses?.map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.warehouseId && <p className="text-xs text-destructive">Please select a warehouse.</p>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {isAdjustment ? (
              <div className="space-y-2">
                <Label htmlFor="newQuantity">New quantity</Label>
                <Input id="newQuantity" type="number" min={0} {...register("newQuantity", { required: true })} />
                {errors.newQuantity && <p className="text-xs text-destructive">Required.</p>}
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input id="quantity" type="number" min={1} {...register("quantity", { required: true })} />
                {errors.quantity && <p className="text-xs text-destructive">Required.</p>}
              </div>
            )}

            {mode === "stock-in" && (
              <div className="space-y-2">
                <Label htmlFor="unitCost">Unit cost (optional)</Label>
                <Input id="unitCost" type="number" step="0.01" {...register("unitCost")} />
              </div>
            )}

            {!isAdjustment && mode !== "stock-in" && (
              <div className="space-y-2">
                <Label htmlFor="reference">Reference (optional)</Label>
                <Input id="reference" {...register("reference")} />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason {isAdjustment && "(required)"}</Label>
            <Input id="reason" placeholder="e.g. Stock count correction" {...register("reason", { required: isAdjustment })} />
            {errors.reason && <p className="text-xs text-destructive">A reason is required for adjustments.</p>}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
