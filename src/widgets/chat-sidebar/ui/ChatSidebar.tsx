import { useState } from 'react';
import { LogOut, MessageCircle, Plus, Search } from 'lucide-react';
import { useChats } from '@/entities/chat';
import { useSession } from '@/entities/session';
import { Avatar, Brand } from '@/shared/ui';
import { formatTime } from '@/shared/lib';

export function ChatSidebar({
  onCreate,
  onDisconnect,
  connectionError,
}: {
  onCreate: () => void;
  onDisconnect: () => void;
  connectionError: boolean;
}) {
  const chats = useChats((state) => state.chats);
  const activeId = useChats((state) => state.activeId);
  const instanceId = useSession((state) => state.instanceId);
  const [search, setSearch] = useState('');
  const visible = chats.filter((chat) =>
    `${chat.title} ${chat.recipient ?? ''}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <aside className={`sidebar ${activeId ? 'mobile-hidden' : ''}`} aria-label="Список чатов">
      <header className="sidebar-header">
        <div className="brand">
          <Brand />
          <div>
            <strong>Telegram</strong>
            <span>через GREEN-API</span>
          </div>
        </div>
        <span className="web-badge">WEB</span>
      </header>
      <div className="sidebar-tools">
        <div className="section-heading">
          <h1>Сообщения</h1>
          <button
            className="icon-button new-chat-button"
            aria-label="Новый чат"
            title="Новый чат"
            onClick={onCreate}
          >
            <Plus />
          </button>
        </div>
        <div className="search-field">
          <Search size={19} />
          <input
            aria-label="Поиск чатов"
            placeholder="Поиск"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>
      <div className="chat-list">
        {visible.map((chat) => {
          const last = chat.messages.at(-1);
          return (
            <button
              className={`chat-item ${activeId === chat.id ? 'selected' : ''}`}
              key={chat.id}
              onClick={() => useChats.getState().select(chat.id)}
              aria-current={activeId === chat.id ? 'true' : undefined}
            >
              <Avatar name={chat.title} id={chat.id} />
              <div className="chat-item-content">
                <div className="chat-item-top">
                  <strong>{chat.title}</strong>
                  {last && <time>{formatTime(last.timestamp)}</time>}
                </div>
                <div className="chat-item-bottom">
                  <span>
                    {chat.draft
                      ? `Черновик: ${chat.draft}`
                      : last
                        ? `${last.direction === 'outgoing' ? 'Вы: ' : ''}${last.text}`
                        : 'Начните разговор'}
                  </span>
                  {chat.unread > 0 && <b className="unread">{chat.unread}</b>}
                </div>
              </div>
            </button>
          );
        })}
        {visible.length === 0 && (
          <div className="sidebar-empty">
            <MessageCircle size={34} strokeWidth={1.3} />
            <h3>{search ? 'Чаты не найдены' : 'Ваши чаты будут здесь'}</h3>
            <p>
              {search
                ? 'Попробуйте другое имя или номер.'
                : 'Начните диалог по номеру телефона или имени пользователя.'}
            </p>
            {!search && (
              <button className="text-button" onClick={onCreate}>
                Написать сообщение
              </button>
            )}
          </div>
        )}
      </div>
      <footer className="sidebar-footer">
        <span className={`connection-dot ${connectionError ? 'warning-dot' : ''}`} />
        <div>
          <strong>{connectionError ? 'Есть проблема с подключением' : 'Инстанс подключён'}</strong>
          <span>ID {instanceId}</span>
        </div>
        <button
          className="icon-button"
          onClick={onDisconnect}
          aria-label="Отключиться"
          title="Отключиться"
        >
          <LogOut size={20} />
        </button>
      </footer>
    </aside>
  );
}
