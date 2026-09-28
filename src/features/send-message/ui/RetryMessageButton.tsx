import { RotateCw } from 'lucide-react';
import { retryMessage } from './send-message';

export function RetryMessageButton({
  chatId,
  messageId,
  disabled,
}: {
  chatId: string;
  messageId: string;
  disabled: boolean;
}) {
  return (
    <button type="button" disabled={disabled} onClick={() => void retryMessage(chatId, messageId)}>
      <RotateCw size={12} /> Отправить повторно
    </button>
  );
}
