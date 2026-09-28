import { ApiError, errorMessage, type GreenApi } from '@/shared/api';

export function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const finish = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', finish);
      resolve();
    };
    const timer = setTimeout(finish, ms);
    signal.addEventListener('abort', finish, { once: true });
  });
}

export async function pollNotifications(
  api: GreenApi,
  signal: AbortSignal,
  apply: (body: Record<string, unknown>) => string | null,
  onStatus: (error: string | null, stopped?: boolean) => void,
) {
  let failures = 0;
  while (!signal.aborted) {
    try {
      const notification = await api.receive(signal);
      if (signal.aborted) return;
      if (notification) {
        const accountError = apply(notification.body);
        await api.acknowledge(notification.receiptId, signal);
        if (signal.aborted) return;
        if (accountError) {
          onStatus(accountError, true);
          return;
        }
      }
      failures = 0;
      onStatus(null);
      // Защита от мгновенных пустых ответов и ограничения частоты запросов.
      await delay(300, signal);
    } catch (error) {
      if (signal.aborted) return;
      const permanent = error instanceof ApiError && [400, 401, 403].includes(error.status);
      onStatus(errorMessage(error), permanent);
      if (permanent) return;
      await delay(Math.min(1000 * 2 ** failures++, 30_000), signal);
    }
  }
}
