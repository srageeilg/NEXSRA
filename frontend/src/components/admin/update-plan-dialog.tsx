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
import { useUpdateBusinessPlan, type AdminBusiness } from "@/hooks/use-admin";

interface FormValues {
  planName: string;
  planExpiresAt: string;
}

export function UpdatePlanDialog({ business }: { business: AdminBusiness }) {
  const [open, setOpen] = useState(false);
  const updatePlan = useUpdateBusinessPlan();
  const { register, handleSubmit, reset } = useForm<FormValues>({
    values: {
      planName: business.planName,
      planExpiresAt: business.planExpiresAt ? business.planExpiresAt.slice(0, 10) : "",
    },
  });

  const onSubmit = (values: FormValues) => {
    updatePlan.mutate(
      {
        id: business.id,
        planName: values.planName,
        planExpiresAt: values.planExpiresAt ? new Date(values.planExpiresAt).toISOString() : null,
      },
      { onSuccess: () => setOpen(false) },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Edit plan
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update plan — {business.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="planName">Plan</Label>
            <Input id="planName" placeholder="e.g. TRIAL, PRO" {...register("planName", { required: true })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="planExpiresAt">Expires on (leave blank for no expiry)</Label>
            <Input id="planExpiresAt" type="date" {...register("planExpiresAt")} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={updatePlan.isPending}>
              {updatePlan.isPending ? "Saving..." : "Save plan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
