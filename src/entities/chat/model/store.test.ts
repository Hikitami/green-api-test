import { beforeEach, describe, expect, it } from 'vitest';
import { useChats, type Message } from './store';

const message: Message = { id: '1', text: 'Привет', timestamp: 100, direction: 'incoming' };
beforeEach(() => useChats.getState().reset());
describe('chat state', () => {
  it('не ставит ответ раньше отправки из-за секундной точности webhook', () => {
    useChats
      .getState()
      .addMessage('a', { ...message, id: 'sent', timestamp: 1999, direction: 'outgoing' });
    useChats.getState().addMessage('a', { ...message, id: 'reply', timestamp: 1000 });
    expect(useChats.getState().chats[0]?.messages.map((item) => item.id)).toEqual([
      'sent',
      'reply',
    ]);
  });
  it('дедуплицирует сообщения и непрочитанные', () => {
    useChats.getState().addMessage('a', message, 'Анна');
    useChats.getState().addMessage('a', message, 'Анна');
    expect(useChats.getState().chats[0]?.messages).toHaveLength(1);
    expect(useChats.getState().chats[0]?.unread).toBe(1);
    useChats.getState().select('a');
    expect(useChats.getState().chats[0]?.unread).toBe(0);
  });
  it('разрешает одинаковый id сообщения в разных чатах', () => {
    useChats.getState().addMessage('a', message);
    useChats.getState().addMessage('b', message);
    expect(useChats.getState().chats).toHaveLength(2);
  });
  it('сохраняет ранний статус и не откатывает read до delivered', () => {
    useChats
      .getState()
      .addMessage('a', { ...message, id: 'local', direction: 'outgoing', status: 'sending' });
    useChats.getState().setStatus('a', 'server', 'read');
    useChats.getState().confirmMessage('a', 'local', 'server');
    useChats.getState().setStatus('a', 'server', 'delivered');
    expect(useChats.getState().chats[0]?.messages[0]).toMatchObject({
      id: 'server',
      status: 'read',
    });
  });
  it('объединяет optimistic message с API-эхом', () => {
    useChats.getState().addMessage('a', { ...message, id: 'local', direction: 'outgoing' });
    useChats.getState().addMessage('a', { ...message, id: 'server', direction: 'outgoing' });
    useChats.getState().confirmMessage('a', 'local', 'server');
    expect(useChats.getState().chats[0]?.messages).toHaveLength(1);
  });
  it('хранит независимые черновики и повторно открывает существующий чат', () => {
    useChats.getState().open({ id: 'a', title: 'Анна' });
    useChats.getState().setDraft('a', 'Не дописано');
    useChats.getState().open({ id: 'b', title: 'Борис' });
    useChats.getState().open({ id: 'a', title: 'Анна' });
    expect(useChats.getState().chats).toHaveLength(2);
    expect(useChats.getState().chats.find((chat) => chat.id === 'a')?.draft).toBe('Не дописано');
  });
});
