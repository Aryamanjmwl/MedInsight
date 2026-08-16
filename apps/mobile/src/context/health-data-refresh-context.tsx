import { createContext, type PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react';

type HealthDataRefreshValue = {
  revision: number;
  invalidateHealthData: () => void;
};

const HealthDataRefreshContext = createContext<HealthDataRefreshValue | null>(null);

export function HealthDataRefreshProvider({ children }: PropsWithChildren) {
  const [revision, setRevision] = useState(0);
  const invalidateHealthData = useCallback(() => setRevision((current) => current + 1), []);
  const value = useMemo(() => ({ revision, invalidateHealthData }), [revision, invalidateHealthData]);

  return <HealthDataRefreshContext.Provider value={value}>{children}</HealthDataRefreshContext.Provider>;
}

export function useHealthDataRefresh() {
  const value = useContext(HealthDataRefreshContext);
  if (!value) throw new Error('useHealthDataRefresh must be used within HealthDataRefreshProvider.');
  return value;
}
