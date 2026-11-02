import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const XOF = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "XOF",
  maximumFractionDigits: 0,
});

export function formatFcfa(amount: number): string {
  return XOF.format(amount).replace(/\u00a0/g, " ");
}

const DATE = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const DATETIME = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return DATE.format(new Date(date));
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return DATETIME.format(new Date(date));
}

const DATETIME_LOCAL = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Africa/Porto-Novo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function toDateTimeLocal(date: Date | string | null | undefined): string {
  if (!date) return "";
  const parts = DATETIME_LOCAL.formatToParts(new Date(date));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function ageFrom(birthDate: Date | string): number {
  const d = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
