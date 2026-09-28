import { Fragment, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Clock3,
  MessageCircle,
  Pencil,
  TriangleAlert,
} from 'lucide-react';
import { useChats, type Message, type MessageStatus } from '@/entities/chat';
import { MessageComposer, RetryMessageButton } from '@/features/send-message';
import { Avatar, Brand } from '@/shared/ui';
import { formatDay, formatTime } from '@/shared/lib';

const statusLabels: Record<MessageStatus, string> = {
  sending: 'Отправляется',
  queued: 'Принято GREEN-API',
  delivered: 'Доставлено',
  read: 'Прочитано',
  failed: 'Не отправлено',
  uncertain: 'Результат неизвестен',
};

function MessageBubble({
  message,
  chatId,
  stopped,
}: {
  message: Message;
  chatId: string;
  stopped: boolean;
}) {
  const failed = message.status === 'failed' || message.status === 'uncertain';
  return (
    <div className={`message-row ${message.direction}`}>
      <div className={`message-bubble ${failed ? 'message-failed' : ''}`}>
        <p>{message.text}</p>
        <div className="message-meta">
          <time dateTime={new Date(message.timestamp).toISOString()}>
            {formatTime(message.timestamp)}
          </time>
          {message.status && (
            <span title={statusLabels[message.status]} aria-label={statusLabels[message.status]}>
              {failed ? (
                <TriangleAlert size={14} />
              ) : message.status === 'sending' ? (
                <Clock3 size={14} />
              ) : ['delivered', 'read'].includes(message.status) ? (
                <CheckCheck size={16} />
              ) : (
                <Check size={16} />
              )}
            </span>
          )}
        </div>
        {failed && (
          <div className="message-error" role="status">
            <span>
              {message.error || 'Telegram не доставил сообщение.'}
              {message.status === 'uncertain' &&
                ' Перед повтором проверьте чат в Telegram: сообщение могло дойти, повтор создаст дубль.'}
            </span>
            <RetryMessageButton chatId={chatId} messageId={message.id} disabled={stopped} />
            <button onClick={() => useChats.getState().restoreMessageDraft(chatId, message.id)}>
              Вернуть текст в поле
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function Conversation({ onCreate, stopped }: { onCreate: () => void; stopped: boolean }) {
  const chat = useChats((state) => state.chats.find((item) => item.id === state.activeId));
  const scroller = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  useEffect(() => {
    nearBottom.current = true;
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [chat?.id]);
  useEffect(() => {
    if (nearBottom.current || chat?.messages.at(-1)?.direction === 'outgoing')
      scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [chat?.messages]);

  if (!chat)
    return (
      <main className="conversation welcome mobile-hidden">
        <div className="welcome-content">
          <div className="welcome-orbit">
            <Brand large />
            <span className="orbit-dot" />
          </div>
          <span className="eyebrow">БЛИЖЕ, ЧЕМ КАЖЕТСЯ</span>
          <h2>
            Хороший разговор
            <br />
            начинается с «Привет»
          </h2>
          <p>
            Отправляйте сообщения в Telegram.
            <br />
            Все ваши диалоги — в одном окне.
          </p>
          <button className="button primary" onClick={onCreate}>
            <Pencil size={18} /> Новое сообщение
          </button>
        </div>
        <div className="welcome-footer">
          <MessageCircle size={16} />
          <span>Личные сообщения · Только самое нужное</span>
        </div>
      </main>
    );
  return (
    <main className="conversation">
      <header className="conversation-header">
        <button
          className="icon-button mobile-back"
          aria-label="Назад к чатам"
          onClick={() => useChats.getState().select(null)}
        >
          <ArrowLeft />
        </button>
        <Avatar name={chat.title} id={chat.id} />
        <div>
          <h2>{chat.title}</h2>
          <p>
            {chat.recipient && chat.recipient !== chat.title
              ? chat.recipient
              : 'Личный диалог в Telegram'}
          </p>
        </div>
        <span className="conversation-label">Telegram</span>
      </header>
      <div
        className="message-list"
        ref={scroller}
        role="log"
        aria-label="Переписка"
        aria-live="polite"
        onScroll={() => {
          const element = scroller.current;
          if (element)
            nearBottom.current =
              element.scrollHeight - element.scrollTop - element.clientHeight < 100;
        }}
      >
        {chat.messages.length === 0 ? (
          <div className="empty-conversation">
            <span>
              <MessageCircle size={30} strokeWidth={1.5} />
            </span>
            <h3>Начните с приветствия</h3>
            <p>
              Напишите первое сообщение.
              <br />
              Ответ собеседника появится здесь.
            </p>
          </div>
        ) : (
          <div className="messages-inner">
            {chat.messages.map((message, index) => {
              const previous = chat.messages[index - 1];
              const day = new Date(message.timestamp).toDateString();
              return (
                <Fragment key={message.id}>
                  {(!previous || new Date(previous.timestamp).toDateString() !== day) && (
                    <div className="day-divider">
                      <span>{formatDay(message.timestamp)}</span>
                    </div>
                  )}
                  <MessageBubble message={message} chatId={chat.id} stopped={stopped} />
                </Fragment>
              );
            })}
          </div>
        )}
      </div>
      <MessageComposer key={chat.id} chat={chat} disabled={stopped} />
    </main>
  );
}
