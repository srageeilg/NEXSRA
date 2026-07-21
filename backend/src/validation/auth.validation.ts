import { z } from "zod";

export const registerBusinessSchema = z.object({
  body: z.object({
    businessName: z.string().min(2).max(120),
    firstName: z.string().min(1).max(60),
    lastName: z.string().min(1).max(60),
    email: z.string().email(),
    password: z.string().min(8).max(72),
    phone: z.string().max(30).optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
    twoFactorCode: z.string().length(6).optional(),
  }),
});

export const verifyEmailSchema = z.object({
  query: z.object({
    token: z.string().min(10),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(10),
    password: z.string().min(8).max(72),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(72),
  }),
});

export const enable2faSchema = z.object({
  body: z.object({
    code: z.string().length(6),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    firstName: z.string().min(1).max(60).optional(),
    lastName: z.string().min(1).max(60).optional(),
    phone: z.string().max(30).optional(),
  }),
});
