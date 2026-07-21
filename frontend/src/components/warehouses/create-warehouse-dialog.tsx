"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Plus } from "lucide-react";
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
import { useCreateWarehouse } from "@/hooks/use-warehouses";

interface FormValues {
  name: string;
  code: string;
  address: string;
}

export function CreateWarehouseDialog() {
  const [open, setOpen] = useState(false);
  const createWarehouse = useCreateWarehouse();
  const { register, handleSubmit, reset } = useForm<FormValues>();

  const onSubmit = (values: FormValues) => {
    createWarehouse.mutate(values, {
      onSuccess: () => {
        setOpen(false);
        reset();
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1.5 h-4 w-4" />
          New warehouse
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add warehouse</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Warehouse name</Label>
            <Input id="name" placeholder="Main Warehouse" {...register("name", { required: true })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="code">Code</Label>
            <Input id="code" placeholder="WH-01" {...register("code", { required: true })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address (optional)</Label>
            <Input id="address" {...register("address")} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createWarehouse.isPending}>
              {createWarehouse.isPending ? "Creating..." : "Create warehouse"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
