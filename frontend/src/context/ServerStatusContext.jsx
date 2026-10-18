import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const ServerStatusContext = createContext({
  isReady: false,
  status: 'connecting', // 'connecting' | 'connected' | 'error'
  database: 'connecting', // 'connecting' | 'connected' | 'disconnected'
  dsp: 'connecting', // 'connecting' | 'connected' | 'disconnected'
  checkHealth: async () => {},
});

export function ServerStatusProvider({ children }) {
  const [statusState, setStatusState] = useState({
    isReady: false,
    status: 'connecting',
    database: 'connecting',
    dsp: 'connecting',
  });

  const checkHealth = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${API_BASE}/health`, { signal: controller.signal });
      clearTimeout(timeout);

      const data = await res.json().catch(() => ({}));
      const isHealthy = res.ok && data.status === 'healthy';

      setStatusState({
        isReady: isHealthy,
        status: isHealthy ? 'connected' : 'connecting',
        database: data.database || (res.ok ? 'connected' : 'disconnected'),
        dsp: data.dsp || (res.ok ? 'connected' : 'disconnected'),
      });

      return isHealthy;
    } catch (err) {
      // In case server is sleeping / warming up, keep status as connecting
      setStatusState((prev) => ({
        ...prev,
        isReady: false,
        status: 'connecting',
        database: 'connecting',
        dsp: 'connecting',
      }));
      return false;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    let timerId = null;

    const poll = async () => {
      const healthy = await checkHealth();
      if (!isMounted) return;

      // While warming up / cold-starting, poll rapidly (every 3s)
      // Once healthy and connected, poll as a heartbeat every 30s
      const nextInterval = healthy ? 30000 : 3000;
      timerId = setTimeout(poll, nextInterval);
    };

    poll();

    return () => {
      isMounted = false;
      if (timerId) clearTimeout(timerId);
    };
  }, [checkHealth]);

  return (
    <ServerStatusContext.Provider value={{ ...statusState, checkHealth }}>
      {children}
    </ServerStatusContext.Provider>
  );
}

export function useServerStatus() {
  return useContext(ServerStatusContext);
}
