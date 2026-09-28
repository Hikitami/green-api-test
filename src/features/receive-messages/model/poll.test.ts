import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, type GreenApi } from '@/shared/api';
import { pollNotifications } from './poll';

afterEach(() => vi.useRealTimers());
describe('notification queue', () => {
  it('подтверждает только после обработки и повторяет неудачный ACK', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const notification = { receiptId: 7, body: { typeWebhook: 'test' } };
    const receive = vi.fn().mockResolvedValue(notification);
    const apply = vi.fn().mockReturnValue(null);
    const acknowledge = vi
      .fn()
      .mockImplementationOnce(async () => {
        throw new Error('offline');
      })
      .mockImplementationOnce(async () => {
        controller.abort();
        return { result: true };
      });
    const api = { receive, acknowledge } as unknown as GreenApi;
    const run = pollNotifications(api, controller.signal, apply, vi.fn());
    await vi.advanceTimersByTimeAsync(1100);
    await run;
    expect(apply).toHaveBeenCalledTimes(2);
    expect(acknowledge).toHaveBeenCalledTimes(2);
    expect(apply.mock.invocationCallOrder[0]).toBeLessThan(
      acknowledge.mock.invocationCallOrder[0]!,
    );
  });
  it('останавливается при ошибке авторизации', async () => {
    const onStatus = vi.fn();
    const receive = vi.fn().mockRejectedValue(new ApiError('Нет доступа', 401));
    await pollNotifications(
      { receive } as unknown as GreenApi,
      new AbortController().signal,
      vi.fn(),
      onStatus,
    );
    expect(receive).toHaveBeenCalledTimes(1);
    expect(onStatus).toHaveBeenCalledWith('Нет доступа', true);
  });
  it('не удаляет уведомление при ошибке обработки', async () => {
    const controller = new AbortController();
    const acknowledge = vi.fn();
    const receive = vi.fn().mockResolvedValue({ receiptId: 7, body: {} });
    await pollNotifications(
      { receive, acknowledge } as unknown as GreenApi,
      controller.signal,
      () => {
        controller.abort();
        throw new Error('invalid');
      },
      vi.fn(),
    );
    expect(acknowledge).not.toHaveBeenCalled();
  });
});
