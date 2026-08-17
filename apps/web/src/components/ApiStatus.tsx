import { useEffect, useState } from 'react';

export type ApiStatusValue = 'checking' | 'online' | 'offline';

interface ApiStatusProps {
  apiUrl: string;
}

export function ApiStatus({ apiUrl }: ApiStatusProps) {
  const [status, setStatus] = useState<ApiStatusValue>('checking');

  useEffect(() => {
    let disposed = false;

    const checkHealth = async () => {
      try {
        const response = await fetch(`${apiUrl.replace(/\/$/, '')}/health`);
        if (!disposed) {
          setStatus(response.ok ? 'online' : 'offline');
        }
      } catch {
        if (!disposed) {
          setStatus('offline');
        }
      }
    };

    void checkHealth();
    const interval = window.setInterval(() => void checkHealth(), 10_000);

    return () => {
      disposed = true;
      window.clearInterval(interval);
    };
  }, [apiUrl]);

  return (
    <section className="status-card" aria-labelledby="api-status-title">
      <div className="status-card__header">
        <h2 id="api-status-title">API status</h2>
        <span className={`status-pill status-pill--${status}`}>{status}</span>
      </div>
      <p className="status-card__detail">Polling <code>/health</code> every 10 seconds.</p>
    </section>
  );
}
