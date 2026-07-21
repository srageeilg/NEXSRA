import nodemailer from "nodemailer";
import { env } from "../config/env";
import { logger } from "../config/logger";

const transporter = env.smtp.host
  ? nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.port === 465,
      auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
    })
  : undefined;

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailInput) {
  if (!transporter) {
    logger.info({ to, subject }, "[DEV EMAIL] SMTP not configured — logging email instead of sending");
    logger.debug({ html }, "[DEV EMAIL] body");
    return;
  }

  await transporter.sendMail({ from: env.smtp.from, to, subject, html });
}

export function verificationEmailTemplate(name: string, verifyUrl: string) {
  return `<p>Hi ${name},</p><p>Welcome to NEXSRA. Please verify your email by clicking the link below:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p><p>This link expires in 24 hours.</p>`;
}

export function passwordResetEmailTemplate(name: string, resetUrl: string) {
  return `<p>Hi ${name},</p><p>We received a request to reset your password. Click below to set a new one:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you did not request this, you can safely ignore this email. This link expires in 1 hour.</p>`;
}
