import { ApiError } from '@/api';

export const PDF_MIME_TYPE = 'application/pdf';
export const MAX_REPORT_UPLOAD_BYTES = 10 * 1024 * 1024;

type ReportFileMetadata = {
  name: string;
  mimeType?: string;
  size?: number;
};

export function validateReportFile({ name, mimeType, size }: ReportFileMetadata) {
  const hasPdfExtension = name.trim().toLocaleLowerCase('en-US').endsWith('.pdf');
  if (!hasPdfExtension || (mimeType && mimeType !== PDF_MIME_TYPE)) {
    return 'Please choose a PDF laboratory report.';
  }
  if (size !== undefined && size > MAX_REPORT_UPLOAD_BYTES) {
    return 'This file is larger than the 10 MB upload limit.';
  }
  return null;
}

export function uploadErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.status === 413) return 'File is larger than the allowed upload limit.';
    if (error.status === 415) return 'Unsupported file type. Please choose a PDF.';
    if (error.status === 422) return 'The PDF could not be processed.';
  }
  return 'Unable to process this report right now.';
}

export function formatFileSize(size?: number) {
  if (size === undefined) return null;
  if (size < 1024) return `${size} bytes`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
