import { create } from 'zustand';
import { createGreenApi, type Credentials, type GreenApi } from '@/shared/api';

interface SessionState {
  api: GreenApi | null;
  instanceId: string | null;
  connect: (credentials: Credentials) => void;
  disconnect: () => void;
}

// Секрет живёт только в замыкании API-клиента, без localStorage и devtools.
export const useSession = create<SessionState>((set) => ({
  api: null,
  instanceId: null,
  connect: (credentials) =>
    set({ api: createGreenApi(credentials), instanceId: credentials.idInstance }),
  disconnect: () => set({ api: null, instanceId: null }),
}));
