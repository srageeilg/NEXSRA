"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useUpdateWarehouse, Warehouse } from "@/hooks/use-warehouses";

interface FormValues {
  name: string;
  code: string;
  address: string;
  isActive: boolean;
}

interface Props {
  warehouse: Warehouse;
}

export function EditWarehouseDialog({ warehouse }: Props) {
  const [open, setOpen] = useState(false);
  const updateWarehouse = useUpdateWarehouse();

  const { register, handleSubmit, control, reset } = useForm<FormValues>({
    defaultValues: {
      name: warehouse.name,
      code: warehouse.code,
      address: warehouse.address ?? "",
      isActive: warehouse.isActive,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: warehouse.name,
        code: warehouse.code,
        address: warehouse.address ?? "",
        isActive: warehouse.isActive,
      });
    }
  }, [open, warehouse, reset]);

  const onSubmit = (values: FormValues) => {
    updateWarehouse.mutate(
      { id: warehouse.id, ...values },
      {
        onSuccess: () => setOpen(false),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit warehouse</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Warehouse name</Label>
            <Input id="edit-name" {...register("name", { required: true })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-code">Code</Label>
            <Input id="edit-code" {...register("code", { required: true })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-address">Address (optional)</Label>
            <Input id="edit-address" {...register("address")} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label>Active</Label>
              <p className="text-xs text-muted-foreground">Inactive warehouses are hidden from stock transfers.</p>
            </div>
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => <Switch checked={field.value} onCheckedChange={field.onChange} />}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={updateWarehouse.isPending}>
              {updateWarehouse.isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
