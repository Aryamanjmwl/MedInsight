import { useCallback, useState } from 'react';
import * as DocumentPicker from 'expo-document-picker';

import { processAndSaveReport, type ProcessAndSaveReportResponse, type ReportUploadFile } from '@/api';
import { useHealthDataRefresh } from '@/context/health-data-refresh-context';
import { PDF_MIME_TYPE, uploadErrorMessage, validateReportFile } from '@/utils/report-upload';

export type SelectedReportFile = ReportUploadFile & { size?: number };
export type ReportUploadPhase = 'idle' | 'selected' | 'uploading' | 'success' | 'error';

export function useReportUpload() {
  const { invalidateHealthData } = useHealthDataRefresh();
  const [phase, setPhase] = useState<ReportUploadPhase>('idle');
  const [selectedFile, setSelectedFile] = useState<SelectedReportFile | null>(null);
  const [result, setResult] = useState<ProcessAndSaveReportResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const reset = useCallback(() => {
    setPhase('idle');
    setSelectedFile(null);
    setResult(null);
    setErrorMessage(null);
  }, []);

  const pickReport = useCallback(async () => {
    try {
      const selection = await DocumentPicker.getDocumentAsync({
        type: PDF_MIME_TYPE,
        copyToCacheDirectory: true,
        multiple: false,
        base64: false,
      });
      if (selection.canceled) return;

      const asset = selection.assets[0];
      const mimeType = asset.mimeType || asset.file?.type || undefined;
      const size = asset.size ?? asset.file?.size;
      const validationError = validateReportFile({ name: asset.name, mimeType, size });
      if (validationError) {
        setSelectedFile(null);
        setResult(null);
        setErrorMessage(validationError);
        setPhase('error');
        return;
      }

      setSelectedFile({
        uri: asset.uri,
        name: asset.name,
        type: mimeType || PDF_MIME_TYPE,
        size,
        webFile: asset.file,
      });
      setResult(null);
      setErrorMessage(null);
      setPhase('selected');
    } catch {
      setErrorMessage('Unable to open the document picker right now.');
      setPhase('error');
    }
  }, []);

  const processReport = useCallback(async () => {
    if (!selectedFile || phase === 'uploading') return;
    setErrorMessage(null);
    setPhase('uploading');

    try {
      const response = await processAndSaveReport(selectedFile);
      setResult(response);
      setSelectedFile(null);
      setPhase('success');
      invalidateHealthData();
    } catch (error) {
      setErrorMessage(uploadErrorMessage(error));
      setPhase('error');
    }
  }, [invalidateHealthData, phase, selectedFile]);

  return { phase, selectedFile, result, errorMessage, pickReport, processReport, reset };
}
