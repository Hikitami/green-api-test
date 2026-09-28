import { z } from 'zod';
import { useChats, type MessageStatus } from '@/entities/chat';

const messageSchema = z.object({
  typeWebhook: z.enum([
    'incomingMessageReceived',
    'outgoingMessageReceived',
    'outgoingAPIMessageReceived',
  ]),
  idMessage: z.string(),
  timestamp: z.number(),
  senderData: z.object({
    chatId: z.string(),
    chatName: z.string().optional(),
    senderName: z.string().optional(),
  }),
  messageData: z.object({
    typeMessage: z.string(),
    textMessageData: z.object({ textMessage: z.string() }).optional(),
    extendedTextMessageData: z.object({ text: z.string() }).optional(),
  }),
});
const statusSchema = z.object({
  typeWebhook: z.literal('outgoingMessageStatus'),
  chatId: z.string(),
  idMessage: z.string(),
  status: z.string(),
});
const stateSchema = z.object({
  typeWebhook: z.literal('stateInstanceChanged'),
  stateInstance: z.string(),
});

export function applyNotification(body: Record<string, unknown>): string | null {
  if (body.typeWebhook === 'stateInstanceChanged') {
    const state = stateSchema.parse(body);
    return state.stateInstance === 'authorized'
      ? null
      : 'Telegram отключён. Авторизуйте инстанс в личном кабинете и подключитесь заново.';
  }
  if (body.typeWebhook === 'outgoingMessageStatus') {
    const event = statusSchema.parse(body);
    const statuses: Record<string, MessageStatus> = {
      sent: 'queued',
      delivered: 'delivered',
      read: 'read',
      failed: 'failed',
      noAccount: 'failed',
      notInGroup: 'failed',
    };
    const status = statuses[event.status];
    if (status) useChats.getState().setStatus(event.chatId, event.idMessage, status);
    return null;
  }
  if (
    !['incomingMessageReceived', 'outgoingMessageReceived', 'outgoingAPIMessageReceived'].includes(
      String(body.typeWebhook),
    )
  )
    return null;
  const event = messageSchema.parse(body);
  const data = event.messageData;
  if (data.typeMessage === 'textMessage' && !data.textMessageData) {
    throw new Error('Missing textMessageData');
  }
  if (data.typeMessage === 'extendedTextMessage' && !data.extendedTextMessageData) {
    throw new Error('Missing extendedTextMessageData');
  }
  const text =
    data.typeMessage === 'textMessage'
      ? data.textMessageData?.textMessage
      : data.typeMessage === 'extendedTextMessage'
        ? data.extendedTextMessageData?.text
        : undefined;
  // Неизвестные/нетекстовые события подтверждаем, чтобы не блокировать очередь.
  if (text === undefined) return null;
  useChats.getState().addMessage(
    event.senderData.chatId,
    {
      id: event.idMessage,
      text,
      timestamp: event.timestamp * 1000,
      direction: event.typeWebhook === 'incomingMessageReceived' ? 'incoming' : 'outgoing',
      status: event.typeWebhook === 'incomingMessageReceived' ? undefined : 'queued',
    },
    event.senderData.chatName || event.senderData.senderName,
  );
  return null;
}
