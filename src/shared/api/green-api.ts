import { z } from 'zod';

export interface Credentials {
  apiUrl: string;
  idInstance: string;
  apiTokenInstance: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status = 0,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Не удалось связаться с GREEN-API. Проверьте подключение к интернету и повторите попытку.';
}

export function validateApiUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new ApiError('Укажите apiUrl из личного кабинета GREEN-API.');
  }
  if (
    url.protocol !== 'https:' ||
    !/^(?:[a-z0-9-]+\.)*api\.green-api\.com$/.test(url.hostname) ||
    url.port ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  ) {
    throw new ApiError(
      'apiUrl должен быть HTTPS-адресом API GREEN-API, например https://4100.api.green-api.com.',
    );
  }
  return url.origin;
}

const notificationSchema = z
  .object({
    receiptId: z.number().int(),
    body: z.record(z.string(), z.unknown()),
  })
  .nullable();
export type Notification = NonNullable<z.infer<typeof notificationSchema>>;

export function createGreenApi(credentials: Credentials) {
  const base = `${validateApiUrl(credentials.apiUrl)}/waInstance${encodeURIComponent(credentials.idInstance)}`;

  async function request<T>(
    method: string,
    schema: z.ZodType<T>,
    options: {
      body?: unknown;
      verb?: string;
      suffix?: string;
      signal?: AbortSignal;
    } = {},
  ): Promise<T> {
    const timeout = AbortSignal.timeout(method === 'receiveNotification' ? 40_000 : 20_000);
    const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
    let response: Response;
    try {
      response = await fetch(
        `${base}/${method}/${encodeURIComponent(credentials.apiTokenInstance)}${options.suffix ?? ''}`,
        {
          method: options.verb ?? (options.body ? 'POST' : 'GET'),
          headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal,
          cache: 'no-store',
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
        },
      );
    } catch (error) {
      if (options.signal?.aborted) throw error;
      throw new ApiError(
        timeout.aborted
          ? 'GREEN-API не ответил вовремя. Проверьте результат в Telegram перед повторной отправкой.'
          : 'Нет связи с GREEN-API. Проверьте интернет и адрес apiUrl.',
      );
    }
    if (!response.ok) {
      const messages: Record<number, string> = {
        400: 'GREEN-API отклонил запрос. Проверьте параметры и настройки уведомлений в личном кабинете.',
        401: 'Неверные учётные данные. Проверьте idInstance и apiTokenInstance.',
        403: 'Нет доступа к инстансу. Проверьте токен, тариф и ограничения аккаунта.',
        429: 'Слишком много запросов. Подождите немного и повторите попытку.',
        469: 'Telegram временно ограничил поиск контактов. Попробуйте позже.',
      };
      throw new ApiError(
        messages[response.status] ?? `GREEN-API временно недоступен (HTTP ${response.status}).`,
        response.status,
      );
    }
    const text = await response.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      throw new ApiError('GREEN-API вернул некорректный ответ.');
    }
    const parsed = schema.safeParse(data);
    if (!parsed.success)
      throw new ApiError(
        'Неожиданный ответ GREEN-API. Проверьте состояние инстанса и ограничения тарифа.',
      );
    return parsed.data;
  }

  return {
    getState: (signal?: AbortSignal) =>
      request('getStateInstance', z.object({ stateInstance: z.string() }), { signal }),
    getSettings: (signal?: AbortSignal) =>
      request(
        'getSettings',
        z.object({
          webhookUrl: z.string().optional(),
          incomingWebhook: z.string().optional(),
          typeInstance: z.string().optional(),
        }),
        { signal },
      ),
    checkAccount: (
      recipient: { phoneNumber: number } | { username: string },
      signal?: AbortSignal,
    ) =>
      request(
        'checkAccount',
        z.object({ exist: z.boolean(), chatId: z.string(), username: z.string().optional() }),
        { body: recipient, signal },
      ),
    sendMessage: (chatId: string, message: string, signal?: AbortSignal) =>
      request('sendMessage', z.object({ idMessage: z.string().min(1) }), {
        body: { chatId, message },
        signal,
      }),
    receive: (signal: AbortSignal) =>
      request('receiveNotification', notificationSchema, { signal, suffix: '?receiveTimeout=30' }),
    acknowledge: (receiptId: number, signal: AbortSignal) =>
      request('deleteNotification', z.object({ result: z.literal(true) }), {
        verb: 'DELETE',
        suffix: `/${receiptId}`,
        signal,
      }),
  };
}
export type GreenApi = ReturnType<typeof createGreenApi>;
