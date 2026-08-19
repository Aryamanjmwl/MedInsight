import { createContext, type PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react';

import { ManualMeasurementDialog } from '@/components/manual-measurement-dialog';

type ManualMeasurementDialogValue = { openManualMeasurement: () => void };

const ManualMeasurementDialogContext = createContext<ManualMeasurementDialogValue | null>(null);

export function ManualMeasurementProvider({ children }: PropsWithChildren) {
  const [visible, setVisible] = useState(false);
  const openManualMeasurement = useCallback(() => setVisible(true), []);
  const closeManualMeasurement = useCallback(() => setVisible(false), []);
  const value = useMemo(() => ({ openManualMeasurement }), [openManualMeasurement]);

  return (
    <ManualMeasurementDialogContext.Provider value={value}>
      {children}
      <ManualMeasurementDialog visible={visible} onClose={closeManualMeasurement} />
    </ManualMeasurementDialogContext.Provider>
  );
}

export function useManualMeasurementDialog() {
  const value = useContext(ManualMeasurementDialogContext);
  if (!value) throw new Error('useManualMeasurementDialog must be used within ManualMeasurementProvider.');
  return value;
}
