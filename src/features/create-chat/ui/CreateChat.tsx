import { useEffect, useRef, useState, type FormEvent } from 'react';
import { LoaderCircle } from 'lucide-react';
import { useSession } from '@/entities/session';
import { useChats } from '@/entities/chat';
import { ApiError, errorMessage } from '@/shared/api';
import { parseRecipient } from '@/shared/lib';
import { Modal } from '@/shared/ui';

export function CreateChat({ onClose }: { onClose: () => void }) {
  const api = useSession((state) => state.api);
  const [recipient, setRecipient] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !api) return;
    const parsed = parseRecipient(recipient);
    if (!parsed) {
      setError('Введите номер с кодом страны или @username Telegram.');
      return;
    }
    const normalized = 'phoneNumber' in parsed ? `+${parsed.phoneNumber}` : parsed.username;
    const existing = useChats.getState().chats.find((chat) => chat.recipient === normalized);
    if (existing) {
      useChats.getState().select(existing.id);
      onClose();
      return;
    }
    setBusy(true);
    setError('');
    controller.current = new AbortController();
    try {
      const result = await api.checkAccount(parsed, controller.current.signal);
      if (!result.exist || !result.chatId)
        throw new ApiError('Пользователь не найден или скрыл номер. Попробуйте его @username.');
      if (controller.current.signal.aborted) return;
      useChats
        .getState()
        .open({ id: result.chatId, title: result.username || normalized, recipient: normalized });
      onClose();
    } catch (error) {
      if (!controller.current.signal.aborted) setError(errorMessage(error));
    } finally {
      if (!controller.current.signal.aborted) setBusy(false);
    }
  }

  return (
    <Modal title="Новое сообщение" onClose={onClose}>
      <p className="muted modal-description">Найдите собеседника в Telegram и начните разговор.</p>
      <form onSubmit={(event) => void submit(event)}>
        <label>
          Номер телефона или @username
          <input
            data-autofocus
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
            placeholder="+7 999 123-45-67 или @username"
            disabled={busy}
            required
          />
        </label>
        <p className="field-hint">Укажите номер в международном формате.</p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="button primary full-width" disabled={busy || !recipient.trim()}>
          {busy ? (
            <>
              <LoaderCircle className="spin" size={18} /> Ищем пользователя…
            </>
          ) : (
            'Начать диалог'
          )}
        </button>
      </form>
    </Modal>
  );
}
