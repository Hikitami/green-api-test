import { useRef, type FormEvent, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { useChats, type Chat } from '@/entities/chat';
import { useSession } from '@/entities/session';
import { sendStoredMessage } from './send-message';
import { useTextareaAutosize } from './use-textarea-autosize';

export function MessageComposer({ chat, disabled }: { chat: Chat; disabled: boolean }) {
  const api = useSession((state) => state.api);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const text = chat.draft;
  useTextareaAutosize(textarea, text);
  const valid = !!text.trim() && text.length <= 4096 && !disabled;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!valid || !api) return;
    const id = crypto.randomUUID();
    const message = text.trim();
    useChats.getState().setDraft(chat.id, '');
    useChats.getState().addMessage(chat.id, {
      id,
      text: message,
      timestamp: Date.now(),
      direction: 'outgoing',
      status: 'sending',
    });
    textarea.current?.focus();
    await sendStoredMessage(chat.id, id);
  }

  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <form className="composer" onSubmit={(event) => void submit(event)}>
      <div className="composer-input">
        <textarea
          ref={textarea}
          aria-label="Сообщение"
          placeholder="Написать сообщение…"
          rows={1}
          value={text}
          disabled={disabled}
          onChange={(event) => useChats.getState().setDraft(chat.id, event.target.value)}
          onKeyDown={keyDown}
        />
        <div className="composer-hint">
          <span>Enter — отправить · Shift + Enter — новая строка</span>
          <span className={text.length > 4096 ? 'danger-text' : ''}>
            {text.length > 0 ? `${text.length} / 4096` : 'Только текст'}
          </span>
        </div>
      </div>
      <button className="send-button" aria-label="Отправить сообщение" disabled={!valid}>
        <Send size={22} />
      </button>
    </form>
  );
}
