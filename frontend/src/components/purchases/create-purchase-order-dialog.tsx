"use client";

import { useEffect, useState } from "react";
import { useFieldArray, useForm, Controller, useWatch } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
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
import { useSuppliers } from "@/hooks/use-suppliers";
import { useCreatePurchaseOrder } from "@/hooks/use-purchases";
import { formatCurrency } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

const VAT_RATE = 0.13;
const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

interface FormValues {
  supplierId: string;
  warehouseId: string;
  items: { productId: string; quantityOrdered: number; unitCost: number; discount: number; taxRate: number }[];
  applyVat: boolean;
}

export function CreatePurchaseOrderDialog() {
  const [open, setOpen] = useState(false);
  const { data: suppliers } = useSuppliers({ pageSize: 100 });
  const { data: warehouses } = useWarehouses();
  const { data: productsData } = useProducts({ pageSize: 100 });
  const createPO = useCreatePurchaseOrder();

  const { register, handleSubmit, control, reset, setValue } = useForm<FormValues>({
    defaultValues: { applyVat: true, items: [{ productId: "", quantityOrdered: 1, unitCost: 0, discount: 0, taxRate: VAT_RATE }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = useWatch({ control, name: "items" });
  const subTotal = roundMoney(watchedItems.reduce(
    (sum, item) => sum + (item.quantityOrdered || 0) * (item.unitCost || 0) - (item.discount || 0),
    0,
  ));
  const applyVat = useWatch({ control, name: "applyVat" });
  const vatTotal = applyVat ? roundMoney(subTotal * VAT_RATE) : 0;

  // Default to the business's primary warehouse so this doesn't need picking every time.
  useEffect(() => {
    if (open && warehouses && warehouses.length > 0) {
      setValue("warehouseId", warehouses[0].id);
    }
  }, [open, warehouses, setValue]);

  const onSubmit = (values: FormValues) => {
    createPO.mutate(values, {
      onSuccess: () => {
        setOpen(false);
        reset({ applyVat: true, items: [{ productId: "", quantityOrdered: 1, unitCost: 0, discount: 0, taxRate: VAT_RATE }] });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1.5 h-4 w-4" />
          New purchase order
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Create purchase order</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Controller
                control={control}
                name="supplierId"
                rules={{ required: true }}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers?.data.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Warehouse</Label>
              <Controller
                control={control}
                name="warehouseId"
                rules={{ required: true }}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select warehouse" />
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
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor="purchase-apply-vat">Apply VAT (13%)</Label>
              <Controller
                control={control}
                name="applyVat"
                render={({ field }) => (
                  <Switch id="purchase-apply-vat" checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
            </div>
            <Label>Items</Label>
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-[1fr_65px_90px_85px_32px] items-center gap-2">
                <Controller
                  control={control}
                  name={`items.${index}.productId`}
                  rules={{ required: true }}
                  render={({ field: selectField }) => (
                    <Select onValueChange={selectField.onChange} value={selectField.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Product" />
                      </SelectTrigger>
                      <SelectContent>
                        {productsData?.data.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <Input
                  type="number"
                  min={1}
                  placeholder="Qty"
                  {...register(`items.${index}.quantityOrdered`, { required: true, valueAsNumber: true })}
                />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Unit cost"
                  {...register(`items.${index}.unitCost`, { required: true, valueAsNumber: true })}
                />
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Discount"
                  {...register(`items.${index}.discount`, { valueAsNumber: true })}
                />
                <input type="hidden" {...register(`items.${index}.taxRate`, { valueAsNumber: true })} />
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length === 1}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ productId: "", quantityOrdered: 1, unitCost: 0, discount: 0, taxRate: VAT_RATE })}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add item
            </Button>
          </div>

          <div className="space-y-1 border-t pt-3 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(subTotal)}</span></div>
            <div className="flex justify-between"><span>VAT ({VAT_RATE * 100}%)</span><span>{formatCurrency(vatTotal)}</span></div>
            <div className="flex justify-between font-semibold"><span>Total</span><span>{formatCurrency(subTotal + vatTotal)}</span></div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={createPO.isPending}>
              {createPO.isPending ? "Creating..." : "Create purchase order"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
