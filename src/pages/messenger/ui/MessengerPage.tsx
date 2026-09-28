import { useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { useChats } from '@/entities/chat';
import { useSession } from '@/entities/session';
import { CreateChat } from '@/features/create-chat';
import { useReceiveMessages } from '@/features/receive-messages';
import { ChatSidebar } from '@/widgets/chat-sidebar';
import { Conversation } from '@/widgets/conversation';
import { Modal } from '@/shared/ui';

export function MessengerPage() {
  const [creating, setCreating] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const connection = useReceiveMessages();
  function disconnect() {
    useSession.getState().disconnect();
    useChats.getState().reset();
  }

  return (
    <div className="messenger-page">
      {connection.error && (
        <div className="connection-banner" role="alert">
          <TriangleAlert size={18} />
          <span>
            {connection.error} {!connection.stopped && 'Повторяем подключение автоматически.'}
          </span>
          {connection.stopped && (
            <button onClick={() => setDisconnecting(true)}>Переподключиться</button>
          )}
        </div>
      )}
      <div className="messenger-shell">
        <ChatSidebar
          onCreate={() => setCreating(true)}
          onDisconnect={() => setDisconnecting(true)}
          connectionError={!!connection.error}
        />
        <Conversation onCreate={() => setCreating(true)} stopped={connection.stopped} />
      </div>
      {creating && <CreateChat onClose={() => setCreating(false)} />}
      {disconnecting && (
        <Modal title="Отключить аккаунт?" onClose={() => setDisconnecting(false)}>
          <p className="muted modal-description">
            Токен, черновики и история этой сессии будут удалены из приложения. Переписка в Telegram
            сохранится.
          </p>
          <div className="modal-actions">
            <button className="button secondary" onClick={() => setDisconnecting(false)}>
              Остаться
            </button>
            <button className="button primary" onClick={disconnect}>
              Отключиться
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
