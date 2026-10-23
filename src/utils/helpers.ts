import { Capacitor } from '@capacitor/core';

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

/** Format a timestamp to a readable time string */
export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Format timestamp to a date group label */
export function getDateGroup(timestamp: number): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0 && now.getDate() === date.getDate()) return 'Today';
  if (diffDays <= 1 && now.getDate() - date.getDate() === 1) return 'Yesterday';
  if (diffDays < 7) return 'This week';
  return 'Earlier';
}

/** Truncate text to a max length */
export function truncate(text: string, maxLength: number = 60): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

/** Sanitize a URL before opening - basic safety */
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return '';
  }
  return trimmed;
}

/** Escape HTML entities to prevent XSS */
export function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/** Debounce a function */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/** Check if running on a native device */
export function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/** Validate barcode formats */
export const barcodeValidators: Record<string, (value: string) => string | null> = {
  'EAN-13': (v) => {
    if (!/^\d{12,13}$/.test(v)) return 'EAN-13 requires 12 or 13 digits';
    return null;
  },
  'EAN-8': (v) => {
    if (!/^\d{7,8}$/.test(v)) return 'EAN-8 requires 7 or 8 digits';
    return null;
  },
  'UPC-A': (v) => {
    if (!/^\d{11,12}$/.test(v)) return 'UPC-A requires 11 or 12 digits';
    return null;
  },
  'Code 128': (v) => {
    if (v.length === 0) return 'Value cannot be empty';
    return null;
  },
  'Code 39': (v) => {
    if (!/^[A-Z0-9 \-.$/+%]*$/.test(v.toUpperCase())) return 'Code 39 supports A-Z, 0-9, and special chars';
    return null;
  },
  'ITF': (v) => {
    if (!/^\d+$/.test(v) || v.length % 2 !== 0) return 'ITF requires an even number of digits';
    return null;
  },
};

/** Calculate EAN-13 checksum for 12 digits */
export function calculateEan13Checksum(digits12: string): number {
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = parseInt(digits12[i], 10);
    sum += i % 2 === 0 ? d : d * 3;
  }
  return (10 - (sum % 10)) % 10;
}

/** Calculate EAN-8 checksum for 7 digits */
export function calculateEan8Checksum(digits7: string): number {
  let sum = 0;
  for (let i = 0; i < 7; i++) {
    const d = parseInt(digits7[i], 10);
    sum += i % 2 === 0 ? d * 3 : d;
  }
  return (10 - (sum % 10)) % 10;
}

/** Calculate UPC-A checksum for 11 digits */
export function calculateUpcChecksum(digits11: string): number {
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    const d = parseInt(digits11[i], 10);
    sum += i % 2 === 0 ? d * 3 : d;
  }
  return (10 - (sum % 10)) % 10;
}

