import { create } from 'zustand';

export type MessageStatus = 'sending' | 'queued' | 'delivered' | 'read' | 'failed' | 'uncertain';
export interface Message {
  id: string;
  text: string;
  timestamp: number;
  direction: 'incoming' | 'outgoing';
  status?: MessageStatus;
  error?: string;
}
export interface Chat {
  id: string;
  title: string;
  recipient?: string;
  messages: Message[];
  unread: number;
  draft: string;
}

interface ChatState {
  chats: Chat[];
  activeId: string | null;
  // Статус может прийти раньше HTTP-ответа sendMessage.
  statuses: Record<string, MessageStatus>;
  open: (chat: Pick<Chat, 'id' | 'title' | 'recipient'>) => void;
  select: (id: string | null) => void;
  addMessage: (chatId: string, message: Message, title?: string) => void;
  confirmMessage: (chatId: string, localId: string, remoteId: string) => void;
  updateMessage: (chatId: string, id: string, patch: Partial<Message>) => void;
  restartMessage: (chatId: string, id: string, attemptId: string, timestamp: number) => void;
  setStatus: (chatId: string, id: string, status: MessageStatus) => void;
  restoreMessageDraft: (chatId: string, id: string) => void;
  setDraft: (id: string, draft: string) => void;
  reset: () => void;
}
const statusKey = (chatId: string, id: string) => `${chatId}:${id}`;
const initialState = { chats: [] as Chat[], activeId: null, statuses: {} };
const advance = (previous: MessageStatus | undefined, next: MessageStatus): MessageStatus => {
  if (previous === 'read' && (next === 'delivered' || next === 'queued')) return previous;
  if (previous === 'delivered' && next === 'queued') return previous;
  return next;
};

export const useChats = create<ChatState>((set) => ({
  ...initialState,
  open: (chat) =>
    set((state) => ({
      activeId: chat.id,
      chats: state.chats.some((item) => item.id === chat.id)
        ? state.chats.map((item) =>
            item.id === chat.id
              ? { ...item, recipient: chat.recipient ?? item.recipient, unread: 0 }
              : item,
          )
        : [{ ...chat, messages: [], unread: 0, draft: '' }, ...state.chats],
    })),
  select: (id) =>
    set((state) => ({
      activeId: id,
      chats: state.chats.map((chat) => (chat.id === id ? { ...chat, unread: 0 } : chat)),
    })),
  addMessage: (chatId, message, title) =>
    set((state) => {
      const existing = state.chats.find((chat) => chat.id === chatId);
      if (existing?.messages.some((item) => item.id === message.id)) return state;
      const chat = existing ?? {
        id: chatId,
        title: title || chatId,
        messages: [],
        unread: 0,
        draft: '',
      };
      const updated = {
        ...chat,
        title: title || chat.title,
        // Webhook timestamps имеют точность до секунды. Внутри секунды сохраняем
        // порядок поступления, иначе ответ может оказаться перед локальной отправкой.
        messages: [...chat.messages, message].sort(
          (a, b) => Math.floor(a.timestamp / 1000) - Math.floor(b.timestamp / 1000),
        ),
        unread:
          chat.unread + (message.direction === 'incoming' && state.activeId !== chatId ? 1 : 0),
      };
      return { chats: [updated, ...state.chats.filter((item) => item.id !== chatId)] };
    }),
  confirmMessage: (chatId, localId, remoteId) =>
    set((state) => ({
      chats: state.chats.map((chat) =>
        chat.id !== chatId
          ? chat
          : {
              ...chat,
              messages: chat.messages
                .filter((message) => message.id !== remoteId || message.id === localId)
                .map((message) =>
                  message.id === localId
                    ? {
                        ...message,
                        id: remoteId,
                        status: state.statuses[statusKey(chatId, remoteId)] ?? 'queued',
                      }
                    : message,
                ),
            },
      ),
    })),
  updateMessage: (chatId, id, patch) =>
    set((state) => ({
      chats: state.chats.map((chat) =>
        chat.id !== chatId
          ? chat
          : {
              ...chat,
              messages: chat.messages.map((message) =>
                message.id === id ? { ...message, ...patch } : message,
              ),
            },
      ),
    })),
  restartMessage: (chatId, id, attemptId, timestamp) =>
    set((state) => {
      const chat = state.chats.find((item) => item.id === chatId);
      const message = chat?.messages.find((item) => item.id === id);
      if (!chat || !message) return state;
      const updated: Chat = {
        ...chat,
        messages: [
          ...chat.messages.filter((item) => item.id !== id),
          { ...message, id: attemptId, timestamp, status: 'sending', error: undefined },
        ],
      };
      return { chats: [updated, ...state.chats.filter((item) => item.id !== chatId)] };
    }),
  setStatus: (chatId, id, status) =>
    set((state) => ({
      statuses: {
        ...state.statuses,
        [statusKey(chatId, id)]: advance(state.statuses[statusKey(chatId, id)], status),
      },
      chats: state.chats.map((chat) =>
        chat.id !== chatId
          ? chat
          : {
              ...chat,
              messages: chat.messages.map((message) =>
                message.id === id
                  ? { ...message, status: advance(message.status, status) }
                  : message,
              ),
            },
      ),
    })),
  restoreMessageDraft: (chatId, id) =>
    set((state) => {
      const chat = state.chats.find((item) => item.id === chatId);
      const message = chat?.messages.find((item) => item.id === id);
      if (
        !chat ||
        !message ||
        message.direction !== 'outgoing' ||
        !['failed', 'uncertain'].includes(message.status ?? '')
      )
        return state;
      const statuses = { ...state.statuses };
      delete statuses[statusKey(chatId, id)];
      return {
        statuses,
        chats: state.chats.map((item) =>
          item.id === chatId
            ? {
                ...item,
                draft: message.text,
                messages: item.messages.filter((entry) => entry.id !== id),
              }
            : item,
        ),
      };
    }),
  setDraft: (id, draft) =>
    set((state) => ({
      chats: state.chats.map((chat) => (chat.id === id ? { ...chat, draft } : chat)),
    })),
  reset: () => set(initialState),
}));
