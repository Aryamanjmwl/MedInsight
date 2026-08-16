import { createContext, type PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react';

import { ReportUploadDialog } from '@/components/report-upload-dialog';
import { useReportUpload } from '@/hooks/use-report-upload';

type ReportUploadDialogValue = { openReportUpload: () => void };

const ReportUploadDialogContext = createContext<ReportUploadDialogValue | null>(null);

export function ReportUploadProvider({ children }: PropsWithChildren) {
  const [visible, setVisible] = useState(false);
  const upload = useReportUpload();
  const openReportUpload = useCallback(() => {
    upload.reset();
    setVisible(true);
  }, [upload.reset]);
  const closeReportUpload = useCallback(() => {
    if (upload.phase === 'uploading') return;
    upload.reset();
    setVisible(false);
  }, [upload.phase, upload.reset]);
  const value = useMemo(() => ({ openReportUpload }), [openReportUpload]);

  return (
    <ReportUploadDialogContext.Provider value={value}>
      {children}
      <ReportUploadDialog visible={visible} onClose={closeReportUpload} {...upload} />
    </ReportUploadDialogContext.Provider>
  );
}

export function useReportUploadDialog() {
  const value = useContext(ReportUploadDialogContext);
  if (!value) throw new Error('useReportUploadDialog must be used within ReportUploadProvider.');
  return value;
}
