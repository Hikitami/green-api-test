import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { useSession } from '@/entities/session';
import { ApiError, createGreenApi, errorMessage, validateApiUrl } from '@/shared/api';

export function ConnectForm() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setError('');
    setBusy(true);
    controller.current = new AbortController();
    try {
      const credentials = {
        apiUrl: validateApiUrl(String(form.get('apiUrl'))),
        idInstance: String(form.get('idInstance')).trim(),
        apiTokenInstance: String(form.get('apiTokenInstance')).trim(),
      };
      if (
        !/^\d+$/.test(credentials.idInstance) ||
        !/^[a-zA-Z0-9_-]+$/.test(credentials.apiTokenInstance)
      )
        throw new ApiError('Проверьте ID и токен: уберите пробелы и посторонние символы.');
      const api = createGreenApi(credentials);
      const state = await api.getState(controller.current.signal);
      if (state.stateInstance !== 'authorized')
        throw new ApiError(
          'Инстанс не авторизован. Подключите Telegram в личном кабинете GREEN-API по QR-коду.',
        );
      const settings = await api.getSettings(controller.current.signal);
      if (settings.typeInstance && settings.typeInstance !== 'telegram')
        throw new ApiError('Нужен инстанс Telegram. Выберите его в личном кабинете GREEN-API.');
      if (settings.webhookUrl || settings.incomingWebhook !== 'yes')
        throw new ApiError(
          'В настройках инстанса очистите webhookUrl и включите incomingWebhook. После сохранения подождите минуту и подключитесь снова.',
        );
      if (!controller.current.signal.aborted) useSession.getState().connect(credentials);
    } catch (error) {
      if (!controller.current.signal.aborted) setError(errorMessage(error));
    } finally {
      if (!controller.current.signal.aborted) setBusy(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="connect-form">
      <label>
        Адрес API <span>apiUrl</span>
        <input
          name="apiUrl"
          type="url"
          placeholder="https://4100.api.green-api.com"
          required
          autoComplete="url"
          disabled={busy}
        />
      </label>
      <label>
        ID инстанса <span>idInstance</span>
        <input
          name="idInstance"
          inputMode="numeric"
          pattern="[0-9]+"
          placeholder="Например, 4100000001"
          required
          disabled={busy}
        />
      </label>
      <label>
        Токен доступа <span>apiTokenInstance</span>
        <div className="password-field">
          <input
            name="apiTokenInstance"
            type={visible ? 'text' : 'password'}
            placeholder="Введите токен инстанса"
            required
            autoComplete="off"
            disabled={busy}
          />
          <button
            type="button"
            className="icon-button"
            aria-label={visible ? 'Скрыть токен' : 'Показать токен'}
            aria-pressed={visible}
            onClick={() => setVisible(!visible)}
          >
            {visible ? <EyeOff /> : <Eye />}
          </button>
        </div>
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="button primary connect-button" disabled={busy}>
        {busy ? (
          <>
            <LoaderCircle className="spin" /> Подключаемся…
          </>
        ) : (
          <>
            Открыть сообщения <ArrowRight size={19} />
          </>
        )}
      </button>
      <p className="form-note">Токен хранится только до закрытия или обновления вкладки.</p>
    </form>
  );
}
