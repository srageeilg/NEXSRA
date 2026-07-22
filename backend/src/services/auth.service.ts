import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import qrcode from "qrcode";
import { Prisma, SystemRole } from "@prisma/client";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/ApiError";
import {
  generateRandomToken,
  generateRefreshTokenValue,
  hashToken,
  refreshTokenExpiryDate,
  signAccessToken,
  verifyAccessToken,
} from "./token.service";
import { sendEmail, verificationEmailTemplate, passwordResetEmailTemplate } from "./email.service";
import { env } from "../config/env";
import { ALL_PERMISSIONS, DEFAULT_ROLE_PERMISSIONS } from "../config/permissions";
import { slugify } from "../utils/slugify";

const BCRYPT_ROUNDS = 12;

interface RegisterBusinessInput {
  businessName: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
}

export async function registerBusiness(input: RegisterBusinessInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw ApiError.conflict("An account with this email already exists");

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const slug = await generateUniqueSlug(input.businessName);
  const emailVerifyToken = generateRandomToken();

  await ensurePermissionsSeeded(prisma);

  const result = await prisma.$transaction(
    async (tx) => {
      const business = await tx.business.create({
        data: {
          name: input.businessName,
          slug,
          email: input.email,
        },
      });

      // Seed default role definitions with their permission sets for this business.
      const roleDefinitions = await Promise.all(
        Object.values(SystemRole).map(async (role) => {
          const permissionKeys = DEFAULT_ROLE_PERMISSIONS[role];
          return tx.roleDefinition.create({
            data: {
              businessId: business.id,
              name: role,
              isSystemRole: true,
              description: `Default permissions for ${role.replace(/_/g, " ")}`,
              permissions: { connect: permissionKeys.map((key) => ({ key })) },
            },
          });
        }),
      );

      const ownerRole = roleDefinitions.find((r) => r.name === SystemRole.BUSINESS_OWNER)!;

      const user = await tx.user.create({
        data: {
          email: input.email,
          password: passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          phone: input.phone,
          role: SystemRole.BUSINESS_OWNER,
          businessId: business.id,
          roleAssignmentId: ownerRole.id,
          emailVerifyToken,
          emailVerifyExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      return { business, user };
    },
    { timeout: 15000 },
  );

  const verifyUrl = `${env.clientUrl}/verify-email?token=${emailVerifyToken}`;
  await sendEmail({
    to: input.email,
    subject: "Verify your NEXSRA account",
    html: verificationEmailTemplate(input.firstName, verifyUrl),
  });

  return { businessId: result.business.id, userId: result.user.id };
}

async function generateUniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  let counter = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.business.findUnique({ where: { slug } });
    if (!existing) return slug;
    slug = `${base}-${counter++}`;
  }
}

async function ensurePermissionsSeeded(client: Prisma.TransactionClient | typeof prisma) {
  const count = await client.permission.count();
  if (count > 0) return;
  await client.permission.createMany({ data: ALL_PERMISSIONS, skipDuplicates: true });
}

export async function verifyEmail(token: string) {
  const user = await prisma.user.findFirst({
    where: { emailVerifyToken: token, emailVerifyExpires: { gt: new Date() } },
  });
  if (!user) throw ApiError.badRequest("Invalid or expired verification link");

  await prisma.user.update({
    where: { id: user.id },
    data: { isEmailVerified: true, emailVerifyToken: null, emailVerifyExpires: null },
  });
}

interface LoginInput {
  email: string;
  password: string;
  twoFactorCode?: string;
  userAgent?: string;
  ipAddress?: string;
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !user.isActive) throw ApiError.unauthorized("Invalid email or password");

  const passwordValid = await bcrypt.compare(input.password, user.password);
  if (!passwordValid) throw ApiError.unauthorized("Invalid email or password");

  if (user.twoFactorEnabled) {
    if (!input.twoFactorCode) {
      return { requiresTwoFactor: true, userId: user.id } as const;
    }
    const valid = authenticator.verify({ token: input.twoFactorCode, secret: user.twoFactorSecret! });
    if (!valid) throw ApiError.unauthorized("Invalid two-factor code");
  }

  const tokens = await issueSession(user.id, user.businessId, user.role, user.roleAssignmentId, input.userAgent, input.ipAddress);

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  return {
    requiresTwoFactor: false,
    ...tokens,
    user: sanitizeUser(user),
  } as const;
}

async function issueSession(
  userId: string,
  businessId: string | null,
  role: SystemRole,
  roleAssignmentId: string | null,
  userAgent?: string,
  ipAddress?: string,
) {
  const accessToken = signAccessToken({ sub: userId, businessId, role, roleAssignmentId });
  const refreshTokenValue = generateRefreshTokenValue();

  await prisma.session.create({
    data: {
      userId,
      refreshToken: hashToken(refreshTokenValue),
      userAgent,
      ipAddress,
      expiresAt: refreshTokenExpiryDate(),
    },
  });

  return { accessToken, refreshToken: refreshTokenValue };
}

export async function refreshSession(refreshTokenValue: string, userAgent?: string, ipAddress?: string) {
  const hashed = hashToken(refreshTokenValue);
  const session = await prisma.session.findUnique({ where: { refreshToken: hashed }, include: { user: true } });

  if (!session || session.status !== "ACTIVE" || session.expiresAt < new Date()) {
    throw ApiError.unauthorized("Session expired, please log in again");
  }

  await prisma.session.update({ where: { id: session.id }, data: { status: "REVOKED" } });

  const tokens = await issueSession(
    session.user.id,
    session.user.businessId,
    session.user.role,
    session.user.roleAssignmentId,
    userAgent,
    ipAddress,
  );

  return { ...tokens, user: sanitizeUser(session.user) };
}

export async function logout(refreshTokenValue: string) {
  const hashed = hashToken(refreshTokenValue);
  await prisma.session.updateMany({ where: { refreshToken: hashed }, data: { status: "REVOKED" } });
}

export async function listSessions(userId: string) {
  return prisma.session.findMany({
    where: { userId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: { id: true, userAgent: true, ipAddress: true, createdAt: true, expiresAt: true },
  });
}

export async function revokeSession(userId: string, sessionId: string) {
  const session = await prisma.session.findFirst({ where: { id: sessionId, userId } });
  if (!session) throw ApiError.notFound("Session not found");
  await prisma.session.update({ where: { id: sessionId }, data: { status: "REVOKED" } });
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return; // Do not leak account existence

  const token = generateRandomToken();
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordResetToken: token, passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000) },
  });

  const resetUrl = `${env.clientUrl}/reset-password?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: "Reset your NEXSRA password",
    html: passwordResetEmailTemplate(user.firstName, resetUrl),
  });
}

export async function resetPassword(token: string, newPassword: string) {
  const user = await prisma.user.findFirst({
    where: { passwordResetToken: token, passwordResetExpires: { gt: new Date() } },
  });
  if (!user) throw ApiError.badRequest("Invalid or expired reset link");

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: passwordHash, passwordResetToken: null, passwordResetExpires: null },
  });

  // Invalidate all existing sessions on password reset.
  await prisma.session.updateMany({ where: { userId: user.id, status: "ACTIVE" }, data: { status: "REVOKED" } });
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) throw ApiError.badRequest("Current password is incorrect");

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await prisma.user.update({ where: { id: userId }, data: { password: passwordHash } });
}

export async function generateTwoFactorSecret(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const secret = authenticator.generateSecret();
  const otpauthUrl = authenticator.keyuri(user.email, "NEXSRA", secret);

  await prisma.user.update({ where: { id: userId }, data: { twoFactorSecret: secret } });

  const qrDataUrl = await qrcode.toDataURL(otpauthUrl);
  return { secret, qrDataUrl };
}

export async function enableTwoFactor(userId: string, code: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  if (!user.twoFactorSecret) throw ApiError.badRequest("Two-factor setup not initiated");

  const valid = authenticator.verify({ token: code, secret: user.twoFactorSecret });
  if (!valid) throw ApiError.badRequest("Invalid verification code");

  await prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } });
}

export async function disableTwoFactor(userId: string) {
  await prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: false, twoFactorSecret: null } });
}

export async function updateProfile(userId: string, data: { firstName?: string; lastName?: string; phone?: string }) {
  const user = await prisma.user.update({ where: { id: userId }, data });
  return sanitizeUser(user);
}

export async function getProfile(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: { business: true, roleAssignment: true },
  });
  return sanitizeUser(user);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitizeUser(user: any) {
  const { password, twoFactorSecret, emailVerifyToken, passwordResetToken, ...safe } = user;
  return safe;
}

export function decodeAccessToken(token: string) {
  return verifyAccessToken(token);
}
