import { lazy, Suspense } from 'react';
import { useSession } from '@/entities/session';
import { ConnectPage } from '@/pages/connect';
import { MessengerPage } from '@/pages/messenger';

const DemoPanel = lazy(() => import('./demo/DemoPanel'));

export function App() {
  const api = useSession((state) => state.api);
  return (
    <>
      <Suspense fallback={null}>
        <DemoPanel />
      </Suspense>
      {api ? <MessengerPage /> : <ConnectPage />}
    </>
  );
}
