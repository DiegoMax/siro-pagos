import { z } from "zod";

const allowedProtocols = new Set(["http:", "https:", "ftp:"]);

export const amountSchema = z.number().finite().positive();

export const nonEmptyStringSchema = z.string().min(1);

export const terminalNumberSchema = z.string().length(10);

export const urlSchema = z.string().url().refine((value) => {
  try {
    return allowedProtocols.has(new URL(value).protocol);
  } catch {
    return false;
  }
}, "URL must use http, https, or ftp.");

export const dateLikeSchema = z
  .union([z.date(), z.string().min(1)])
  .refine((value) => !Number.isNaN(new Date(value).valueOf()), {
    message: "Invalid date value."
  });

export function toIsoDate(value: Date | string | null | undefined): string | null {
  if (value == null) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function headersToObject(headers: Headers): Record<string, string> {
  return Object.fromEntries(headers.entries());
}
