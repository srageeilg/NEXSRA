"use client";

import { useEffect, useState } from "react";
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
} from "@/components/ui/dialog";
import { useUpdateCustomer, Customer } from "@/hooks/use-customers";

interface FormValues {
  name: string;
  email: string;
  phone: string;
  address: string;
  creditLimit: number;
}

interface Props {
  customer: Customer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCustomerDialog({ customer, open, onOpenChange }: Props) {
  const updateCustomer = useUpdateCustomer();
  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: {
      name: customer.name,
      email: customer.email ?? "",
      phone: customer.phone ?? "",
      address: customer.address ?? "",
      creditLimit: parseFloat(customer.creditLimit) || 0,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: customer.name,
        email: customer.email ?? "",
        phone: customer.phone ?? "",
        address: customer.address ?? "",
        creditLimit: parseFloat(customer.creditLimit) || 0,
      });
    }
  }, [open, customer, reset]);

  const onSubmit = (values: FormValues) => {
    updateCustomer.mutate({ id: customer.id, ...values }, { onSuccess: () => onOpenChange(false) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit customer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Customer name</Label>
            <Input {...register("name", { required: true })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" {...register("email")} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input {...register("phone")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input {...register("address")} />
          </div>
          <div className="space-y-2">
            <Label>Credit limit</Label>
            <Input type="number" step="0.01" {...register("creditLimit")} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={updateCustomer.isPending}>
              {updateCustomer.isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
