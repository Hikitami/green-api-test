import { useChats } from '@/entities/chat';
import { useSession } from '@/entities/session';
import { ApiError, errorMessage } from '@/shared/api';

export async function sendStoredMessage(chatId: string, id: string) {
  const api = useSession.getState().api;
  const message = useChats
    .getState()
    .chats.find((chat) => chat.id === chatId)
    ?.messages.find((item) => item.id === id);
  if (!api || !message) return;
  try {
    const response = await api.sendMessage(chatId, message.text);
    if (useSession.getState().api !== api) return;
    useChats.getState().confirmMessage(chatId, id, response.idMessage);
  } catch (error) {
    if (useSession.getState().api !== api) return;
    const rejected = error instanceof ApiError && error.status >= 400 && error.status < 500;
    useChats.getState().updateMessage(chatId, id, {
      status: rejected ? 'failed' : 'uncertain',
      error: errorMessage(error),
    });
  }
}

export async function retryMessage(chatId: string, id: string) {
  if (!useSession.getState().api) return;
  const message = useChats
    .getState()
    .chats.find((chat) => chat.id === chatId)
    ?.messages.find((item) => item.id === id);
  if (
    !message ||
    message.direction !== 'outgoing' ||
    !['failed', 'uncertain'].includes(message.status ?? '')
  )
    return;
  // Новый ID попытки отделяет запоздавшие статусы предыдущей отправки.
  const attemptId = crypto.randomUUID();
  useChats.getState().restartMessage(chatId, id, attemptId, Date.now());
  await sendStoredMessage(chatId, attemptId);
}
