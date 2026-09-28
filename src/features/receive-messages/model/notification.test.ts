import { beforeEach, describe, expect, it } from 'vitest';
import { useChats } from '@/entities/chat';
import { applyNotification } from './notification';

const body = {
  typeWebhook: 'incomingMessageReceived',
  idMessage: '1',
  timestamp: 1000,
  senderData: { chatId: '123', chatName: 'Анна' },
  messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'Ответ' } },
};
beforeEach(() => useChats.getState().reset());
describe('notifications', () => {
  it('добавляет ответ в уже открытый чат с числовым ID', () => {
    useChats.getState().open({ id: '123', title: '+79991234567' });
    applyNotification(body);
    expect(useChats.getState().chats).toHaveLength(1);
    expect(useChats.getState().chats[0]?.messages[0]).toMatchObject({
      text: 'Ответ',
      timestamp: 1_000_000,
    });
  });
  it('принимает текст с URL', () => {
    applyNotification({
      ...body,
      messageData: {
        typeMessage: 'extendedTextMessage',
        extendedTextMessageData: { text: 'https://example.com' },
      },
    });
    expect(useChats.getState().chats[0]?.messages[0]?.text).toBe('https://example.com');
  });
  it('игнорирует файлы и неизвестные события', () => {
    applyNotification({ ...body, messageData: { typeMessage: 'imageMessage' } });
    applyNotification({ typeWebhook: 'futureEvent' });
    expect(useChats.getState().chats).toHaveLength(0);
  });
  it('не подтверждает повреждённый текстовый envelope', () =>
    expect(() => applyNotification({ typeWebhook: 'incomingMessageReceived' })).toThrow());
});
