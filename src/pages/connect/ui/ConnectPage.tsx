import { ArrowUpRight, KeyRound, MessageCircle, ShieldCheck } from 'lucide-react';
import { ConnectForm } from '@/features/connect-instance';
import { Brand } from '@/shared/ui';

export function ConnectPage() {
  return (
    <main className="connect-page">
      <header className="connect-header">
        <a href="/" className="brand">
          <Brand />
          <div>
            <strong>Telegram</strong>
            <span>через GREEN-API</span>
          </div>
        </a>
        <a
          className="documentation-link"
          href="https://green-api.com/telegram/docs/before-start/"
          target="_blank"
          rel="noreferrer"
        >
          Как подключиться <ArrowUpRight size={17} />
        </a>
      </header>
      <div className="connect-layout">
        <section className="connect-intro">
          <span className="eyebrow">
            <span className="connection-dot" /> ПРОСТО ОСТАВАЙТЕСЬ НА СВЯЗИ
          </span>
          <h1>
            Ваш Telegram.
            <br />
            Меньше лишнего.
            <br />
            <span>Больше общения.</span>
          </h1>
          <p>
            Простой веб-клиент для личных сообщений.
            <br />
            Подключите аккаунт и начните разговор.
          </p>
          <div className="chat-preview" aria-hidden="true">
            <div className="preview-heading">
              <span className="preview-avatar">А</span>
              <div>
                <strong>Алексей</strong>
                <small>Telegram</small>
              </div>
              <MessageCircle size={21} />
            </div>
            <div className="preview-messages">
              <div className="preview-bubble">
                Привет! Удобно обсудить проект?<small>12:40</small>
              </div>
              <div className="preview-bubble preview-outgoing">
                Привет! Да, я на связи 👋<small>12:41 ✓✓</small>
              </div>
              <span className="preview-caption">Всего одно сообщение — и вы на связи.</span>
            </div>
          </div>
          <div className="intro-footer">
            <ShieldCheck size={18} />
            <span>Прямое подключение к GREEN-API</span>
          </div>
        </section>
        <section className="connect-card">
          <div className="card-icon">
            <KeyRound size={24} />
          </div>
          <h2>Подключить аккаунт</h2>
          <p className="card-description">
            Введите данные инстанса Telegram
            <br />
            из{' '}
            <a href="https://console.green-api.com/" target="_blank" rel="noreferrer">
              личного кабинета GREEN-API <ArrowUpRight size={13} />
            </a>
            .
          </p>
          <ConnectForm />
          <details className="setup-help">
            <summary>Что нужно настроить перед входом?</summary>
            <ol>
              <li>Создайте инстанс Telegram в GREEN-API.</li>
              <li>Авторизуйте его по QR-коду через Telegram → Настройки → Устройства.</li>
              <li>
                Включите incomingWebhook, outgoingWebhook и stateWebhook. Оставьте webhookUrl
                пустым.
              </li>
              <li>Скопируйте apiUrl, idInstance и apiTokenInstance в форму.</li>
            </ol>
            <p>
              Используйте один клиент для очереди уведомлений. История этого приложения хранится в
              памяти и очищается при обновлении страницы.
            </p>
          </details>
        </section>
      </div>
      <footer className="connect-footer">
        <span>Личные сообщения. Ничего лишнего.</span>
        <span>Telegram-клиент на GREEN-API · Неофициальное приложение</span>
      </footer>
    </main>
  );
}
