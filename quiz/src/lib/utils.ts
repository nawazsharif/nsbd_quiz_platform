import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatTaka(amount: number, options?: { fromCents?: boolean; minimumFractionDigits?: number; maximumFractionDigits?: number }) {
  const { fromCents = false, minimumFractionDigits = 2, maximumFractionDigits = 2 } = options ?? {};
  const value = fromCents ? amount / 100 : amount;

  const formatted = Number.isFinite(value)
    ? value.toLocaleString('en-IN', { minimumFractionDigits, maximumFractionDigits })
    : '0.00';

  return `৳${formatted}`;
}

export function stripHtmlTags(html: string): string {
  if (!html) return '';
  // Remove HTML tags and decode common HTML entities
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&hellip;/g, '...')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&lsquo;/g, "'")
    .replace(/&rsquo;/g, "'")
    .trim();
}

export function sanitizeText(text: string | null | undefined): string {
  if (!text) return '';
  return stripHtmlTags(String(text));
}
