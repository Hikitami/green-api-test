import { createId } from '@/shared/lib';
import { ApiError, type GreenApi, type Notification } from '@/shared/api';
import { contacts, historyEvents, textEvent } from './fixtures';

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    signal?.throwIfAborted();
    const abort = () => {
      clearTimeout(timer);
      reject(signal?.reason);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', abort, { once: true });
  });
}

export function createMockApi(onFailureConsumed?: () => void) {
  let receiptId = 0;
  let failNext = false;
  let replyIndex = 0;
  const replies = [
    'Сообщение получил! Всё отображается 👍',
    'Да, вижу. Давай продолжим.',
    'Отлично! Ответ тоже должен появиться в чате.',
  ];
  const queue: { notification: Notification; readyAt: number }[] = [];
  function enqueue(body: Record<string, unknown>, delay = 0) {
    queue.push({ notification: { receiptId: ++receiptId, body }, readyAt: Date.now() + delay });
  }
  historyEvents().forEach((event) => enqueue(event));

  const api: GreenApi = {
    async getState(signal) {
      await wait(150, signal);
      return { stateInstance: 'authorized' };
    },
    async getSettings(signal) {
      await wait(150, signal);
      return { incomingWebhook: 'yes', webhookUrl: '', typeInstance: 'telegram' };
    },
    async checkAccount(recipient, signal) {
      await wait(450, signal);
      if ('username' in recipient && recipient.username === '@not_found')
        return { exist: false, chatId: '' };
      const contact = contacts.find((item) =>
        'phoneNumber' in recipient
          ? item.phone === recipient.phoneNumber
          : item.username === recipient.username.toLowerCase(),
      );
      const chatId =
        contact?.id ??
        ('phoneNumber' in recipient
          ? String(recipient.phoneNumber)
          : recipient.username.toLowerCase());
      return {
        exist: true,
        chatId,
        username: contact?.username ?? ('username' in recipient ? recipient.username : undefined),
      };
    },
    async sendMessage(chatId, _message, signal) {
      await wait(450, signal);
      if (failNext) {
        failNext = false;
        onFailureConsumed?.();
        throw new ApiError(
          'Тестовая ошибка: слишком много запросов. Попробуйте отправить сообщение повторно.',
          429,
        );
      }
      const idMessage = createId();
      enqueue(
        { typeWebhook: 'outgoingMessageStatus', chatId, idMessage, status: 'delivered' },
        400,
      );
      enqueue({ typeWebhook: 'outgoingMessageStatus', chatId, idMessage, status: 'read' }, 1000);
      enqueue(
        textEvent(chatId, replies[replyIndex++ % replies.length]!, false, Date.now() + 1700),
        1700,
      );
      return { idMessage };
    },
    async receive(signal) {
      await wait(200, signal);
      const head = queue[0];
      return head && head.readyAt <= Date.now() ? head.notification : null;
    },
    async acknowledge(id, signal) {
      signal.throwIfAborted();
      const index = queue.findIndex((item) => item.notification.receiptId === id);
      if (index >= 0) queue.splice(index, 1);
      return { result: true };
    },
  };
  return {
    api,
    failNextSend: () => {
      failNext = true;
    },
    incoming: (chatId: string) =>
      enqueue(
        textEvent(
          chatId,
          'Это новое входящее сообщение. Проверяем уведомления и счётчик непрочитанных.',
        ),
      ),
  };
}
