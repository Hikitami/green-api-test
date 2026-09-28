export function parseRecipient(
  value: string,
): { phoneNumber: number } | { username: string } | null {
  const trimmed = value.trim();
  if (/^@[a-zA-Z][a-zA-Z0-9_]{3,31}$/.test(trimmed)) return { username: trimmed };
  if (!/^\+?[\d\s()-]+$/.test(trimmed)) return null;
  let digits = trimmed.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('8')) digits = `7${digits.slice(1)}`;
  if (!/^[1-9]\d{6,14}$/.test(digits)) return null;
  return { phoneNumber: Number(digits) };
}

export const formatTime = (timestamp: number) =>
  new Intl.DateTimeFormat('ru', { hour: '2-digit', minute: '2-digit' }).format(timestamp);
export const formatDay = (timestamp: number) =>
  new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long' }).format(timestamp);
