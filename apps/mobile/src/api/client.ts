import { Platform } from 'react-native';

import { getSupabaseClient } from '@/auth/supabase';

const LOCAL_WEB_API_URL = 'http://127.0.0.1:8000';

type FetchImplementation = typeof fetch;

type ApiErrorOptions = {
  message: string;
  endpoint: string;
  status?: number | null;
  cause?: Error;
};

export class ApiError extends Error {
  readonly status: number | null;
  readonly endpoint: string;
  readonly cause?: Error;

  constructor({ message, endpoint, status = null, cause }: ApiErrorOptions) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.endpoint = endpoint;
    this.cause = cause;
  }
}

export function resolveApiBaseUrl(
  configuredUrl = process.env.EXPO_PUBLIC_API_URL,
  platform = Platform.OS,
) {
  const trimmedUrl = configuredUrl?.trim();

  if (trimmedUrl) {
    return trimmedUrl.replace(/\/+$/, '');
  }

  if (platform === 'web') {
    return LOCAL_WEB_API_URL;
  }

  throw new ApiError({
    message: 'EXPO_PUBLIC_API_URL must be configured for native clients.',
    endpoint: 'configuration',
  });
}

function buildUrl(endpoint: string) {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${resolveApiBaseUrl()}${path}`;
}

async function getResponseErrorMessage(response: Response) {
  try {
    const payload: unknown = await response.json();
    if (
      typeof payload === 'object' &&
      payload !== null &&
      'detail' in payload
    ) {
      if (typeof payload.detail === 'string') return payload.detail;
      if (Array.isArray(payload.detail)) {
        const firstMessage = payload.detail.find(
          (item): item is { msg: string } => typeof item === 'object' && item !== null && 'msg' in item && typeof item.msg === 'string',
        )?.msg;
        if (firstMessage) return firstMessage.replace(/^Value error,\s*/i, '');
      }
    }
  } catch {
    // The HTTP status remains the useful signal when an error body is not JSON.
  }

  return `API request failed with status ${response.status}.`;
}

async function parseJsonResponse<T>(response: Response, endpoint: string) {
  if (!response.ok) {
    throw new ApiError({
      message: await getResponseErrorMessage(response),
      status: response.status,
      endpoint,
    });
  }

  try {
    return (await response.json()) as T;
  } catch (error) {
    throw new ApiError({
      message: 'The MedInsight API returned invalid JSON.',
      status: response.status,
      endpoint,
      cause: error instanceof Error ? error : undefined,
    });
  }
}

async function requestJson<T>(
  endpoint: string,
  init: RequestInit,
  fetchImplementation: FetchImplementation,
) {
  let response: Response;

  const sessionResult = await getSupabaseClient().auth.getSession();
  const accessToken = sessionResult.data.session?.access_token;
  if (!accessToken) {
    throw new ApiError({
      message: 'Your session has expired. Please sign in again.',
      endpoint,
      status: 401,
    });
  }

  const authenticatedInit: RequestInit = {
    ...init,
    headers: {
      ...Object.fromEntries(new Headers(init.headers).entries()),
      Authorization: `Bearer ${accessToken}`,
    },
  };

  try {
    response = await fetchImplementation(buildUrl(endpoint), authenticatedInit);
    if (response.status === 401) {
      const refreshed = await getSupabaseClient().auth.refreshSession();
      const refreshedToken = refreshed.data.session?.access_token;
      if (!refreshedToken) {
        await getSupabaseClient().auth.signOut({ scope: 'local' });
      } else {
        response = await fetchImplementation(buildUrl(endpoint), {
          ...authenticatedInit,
          headers: {
            ...Object.fromEntries(new Headers(authenticatedInit.headers).entries()),
            Authorization: `Bearer ${refreshedToken}`,
          },
        });
      }
      if (response.status === 401) {
        await getSupabaseClient().auth.signOut({ scope: 'local' });
      }
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError({
      message: 'Unable to reach the MedInsight API.',
      endpoint,
      cause: error instanceof Error ? error : undefined,
    });
  }

  return parseJsonResponse<T>(response, endpoint);
}

export async function getJson<T>(
  endpoint: string,
  fetchImplementation: FetchImplementation = globalThis.fetch,
): Promise<T> {
  return requestJson<T>(
    endpoint,
    {
      method: 'GET',
      headers: { Accept: 'application/json' },
    },
    fetchImplementation,
  );
}

export function postJson<T>(
  endpoint: string,
  fetchImplementation: FetchImplementation = globalThis.fetch,
) {
  return requestJson<T>(
    endpoint,
    {
      method: 'POST',
      headers: { Accept: 'application/json' },
    },
    fetchImplementation,
  );
}

export function postJsonBody<T>(
  endpoint: string,
  body: unknown,
  fetchImplementation: FetchImplementation = globalThis.fetch,
) {
  return requestJson<T>(
    endpoint,
    {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    fetchImplementation,
  );
}

export function deleteJson<T>(
  endpoint: string,
  fetchImplementation: FetchImplementation = globalThis.fetch,
) {
  return requestJson<T>(
    endpoint,
    {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    },
    fetchImplementation,
  );
}

export function postFormData<T>(
  endpoint: string,
  formData: FormData,
  fetchImplementation: FetchImplementation = globalThis.fetch,
) {
  return requestJson<T>(
    endpoint,
    {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: formData,
    },
    fetchImplementation,
  );
}
