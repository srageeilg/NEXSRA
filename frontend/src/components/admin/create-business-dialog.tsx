"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Plus, Dices } from "lucide-react";
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
import { useCreateBusiness } from "@/hooks/use-admin";

interface FormValues {
  businessName: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerEmail: string;
  ownerPassword: string;
  planName: string;
  planExpiresAt: string;
}

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  let out = "";
  for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function CreateBusinessDialog() {
  const [open, setOpen] = useState(false);
  const createBusiness = useCreateBusiness();
  const { register, handleSubmit, reset, setValue, watch } = useForm<FormValues>({
    defaultValues: { planName: "TRIAL" },
  });

  const onSubmit = (values: FormValues) => {
    createBusiness.mutate(
      {
        businessName: values.businessName,
        ownerFirstName: values.ownerFirstName,
        ownerLastName: values.ownerLastName,
        ownerEmail: values.ownerEmail,
        ownerPassword: values.ownerPassword,
        planName: values.planName || undefined,
        planExpiresAt: values.planExpiresAt ? new Date(values.planExpiresAt).toISOString() : undefined,
      },
      {
        onSuccess: () => {
          setOpen(false);
          reset({ planName: "TRIAL" });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1.5 h-4 w-4" />
          New client
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create client business</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="businessName">Business name</Label>
            <Input id="businessName" placeholder="Acme Retail Co." {...register("businessName", { required: true })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ownerFirstName">Owner first name</Label>
              <Input id="ownerFirstName" {...register("ownerFirstName", { required: true })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ownerLastName">Owner last name</Label>
              <Input id="ownerLastName" {...register("ownerLastName", { required: true })} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ownerEmail">Owner email (used to log in)</Label>
            <Input id="ownerEmail" type="email" placeholder="owner@client.com" {...register("ownerEmail", { required: true })} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ownerPassword">Initial password</Label>
            <div className="flex gap-2">
              <Input
                id="ownerPassword"
                placeholder="At least 8 characters"
                {...register("ownerPassword", { required: true, minLength: 8 })}
              />
              <Button type="button" variant="outline" size="icon" onClick={() => setValue("ownerPassword", generatePassword())}>
                <Dices className="h-4 w-4" />
              </Button>
            </div>
            {watch("ownerPassword") && (
              <p className="text-xs text-muted-foreground">
                Share this password with the client — they can change it after logging in.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="planName">Plan</Label>
              <Input id="planName" placeholder="e.g. TRIAL, PRO" {...register("planName")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="planExpiresAt">Plan expires (optional)</Label>
              <Input id="planExpiresAt" type="date" {...register("planExpiresAt")} />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={createBusiness.isPending}>
              {createBusiness.isPending ? "Creating..." : "Create client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
