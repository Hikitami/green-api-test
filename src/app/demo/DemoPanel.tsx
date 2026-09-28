import { useState } from 'react';
import { useSession } from '@/entities/session';
import { useChats } from '@/entities/chat';
import { createMockApi } from './mock-api';
import { contacts } from './fixtures';
import './demo.css';

export default function DemoPanel() {
  const api = useSession((state) => state.api);
  const [mock, setMock] = useState<ReturnType<typeof createMockApi> | null>(null);
  const [failureArmed, setFailureArmed] = useState(false);
  const active = !!mock && api === mock.api;

  function start() {
    const next = createMockApi(() => setFailureArmed(false));
    useChats.getState().reset();
    contacts.forEach((contact) =>
      useChats
        .getState()
        .open({ id: contact.id, title: contact.title, recipient: contact.username }),
    );
    useChats.getState().select('100001');
    useSession.setState({ api: next.api, instanceId: 'DEMO · без подключения' });
    setMock(next);
    setFailureArmed(false);
  }

  if (!active)
    return api ? null : (
      <button className="demo-launch" onClick={start}>
        Открыть демо без аккаунта
      </button>
    );
  return (
    <div className="demo-toolbar" role="region" aria-label="Управление деморежимом">
      <strong>
        ДЕМО <span>Вымышленные данные · сообщения не отправляются в Telegram</span>
      </strong>
      <div>
        <button onClick={() => mock.incoming(useChats.getState().activeId || '100002')}>
          Входящее сообщение
        </button>
        <button
          onClick={() => {
            mock.failNextSend();
            setFailureArmed(true);
          }}
        >
          {failureArmed ? 'Ошибка следующей отправки включена' : 'Ошибка следующей отправки'}
        </button>
        <button
          onClick={() => {
            useSession.getState().disconnect();
            useChats.getState().reset();
            setMock(null);
          }}
        >
          Выйти из демо
        </button>
      </div>
    </div>
  );
}
