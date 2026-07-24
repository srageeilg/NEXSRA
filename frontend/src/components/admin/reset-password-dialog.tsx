"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Dices } from "lucide-react";
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
import { useResetUserPassword, type AdminUser } from "@/hooks/use-admin";

interface FormValues {
  newPassword: string;
}

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  let out = "";
  for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export function ResetPasswordDialog({ user }: { user: AdminUser }) {
  const [open, setOpen] = useState(false);
  const resetPassword = useResetUserPassword();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>();

  const onSubmit = (values: FormValues) => {
    resetPassword.mutate(
      { id: user.id, newPassword: values.newPassword },
      {
        onSuccess: () => {
          setOpen(false);
          reset();
        },
      },
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
          Reset password
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Reset password — {user.firstName} {user.lastName}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">New password</Label>
            <div className="flex gap-2">
              <Input
                id="newPassword"
                type="text"
                placeholder="At least 8 characters"
                {...register("newPassword", { required: true, minLength: 8 })}
              />
              <Button type="button" variant="outline" size="icon" onClick={() => setValue("newPassword", generatePassword())}>
                <Dices className="h-4 w-4" />
              </Button>
            </div>
            {errors.newPassword && (
              <p className="text-xs text-destructive">Password is required and must be at least 8 characters.</p>
            )}
            {!errors.newPassword && watch("newPassword") && (
              <p className="text-xs text-muted-foreground">
                This immediately signs the user out everywhere. Share this password with them directly.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={resetPassword.isPending}>
              {resetPassword.isPending ? "Resetting..." : "Reset password"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
