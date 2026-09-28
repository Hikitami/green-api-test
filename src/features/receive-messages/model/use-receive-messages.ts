import { useEffect, useState } from 'react';
import { useSession } from '@/entities/session';
import { applyNotification } from './notification';
import { pollNotifications } from './poll';

export function useReceiveMessages() {
  const api = useSession((state) => state.api);
  const [connection, setConnection] = useState<{ error: string | null; stopped: boolean }>({
    error: null,
    stopped: false,
  });
  useEffect(() => {
    if (!api) return;
    const controller = new AbortController();
    void pollNotifications(api, controller.signal, applyNotification, (error, stopped = false) =>
      setConnection({ error, stopped }),
    );
    return () => controller.abort();
  }, [api]);
  return connection;
}
