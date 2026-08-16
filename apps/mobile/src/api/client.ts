import { Platform } from 'react-native';

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
      'detail' in payload &&
      typeof payload.detail === 'string'
    ) {
      return payload.detail;
    }
  } catch {
    // The HTTP status remains the useful signal when an error body is not JSON.
  }

  return `API request failed with status ${response.status}.`;
}

export async function getJson<T>(
  endpoint: string,
  fetchImplementation: FetchImplementation = globalThis.fetch,
): Promise<T> {
  let response: Response;

  try {
    response = await fetchImplementation(buildUrl(endpoint), {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError({
      message: 'Unable to reach the MedInsight API.',
      endpoint,
      cause: error instanceof Error ? error : undefined,
    });
  }

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
