"use client";

import { useState } from "react";
import { useFieldArray, useForm, Controller } from "react-hook-form";
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

interface FormValues {
  supplierId: string;
  warehouseId: string;
  items: { productId: string; quantityOrdered: number; unitCost: number }[];
}

export function CreatePurchaseOrderDialog() {
  const [open, setOpen] = useState(false);
  const { data: suppliers } = useSuppliers({ pageSize: 100 });
  const { data: warehouses } = useWarehouses();
  const { data: productsData } = useProducts({ pageSize: 100 });
  const createPO = useCreatePurchaseOrder();

  const { register, handleSubmit, control, reset } = useForm<FormValues>({
    defaultValues: { items: [{ productId: "", quantityOrdered: 1, unitCost: 0 }] },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const onSubmit = (values: FormValues) => {
    createPO.mutate(values, {
      onSuccess: () => {
        setOpen(false);
        reset({ items: [{ productId: "", quantityOrdered: 1, unitCost: 0 }] });
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
            <Label>Items</Label>
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-[1fr_80px_100px_32px] items-center gap-2">
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
                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length === 1}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ productId: "", quantityOrdered: 1, unitCost: 0 })}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add item
            </Button>
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
