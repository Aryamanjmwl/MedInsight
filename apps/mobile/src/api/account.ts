import { deleteJson } from '@/api/client';

export type DataDeletionResponse = {
  status: 'deleted';
  reports_deleted: number;
  biomarkers_deleted: number;
};

export type AccountDeletionResponse = DataDeletionResponse & {
  account_deleted: true;
};

export function deleteMyHealthData() {
  return deleteJson<DataDeletionResponse>('/account/data');
}

export function deleteMyAccount() {
  return deleteJson<AccountDeletionResponse>('/account');
}
