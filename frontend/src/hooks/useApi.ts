import { useState, useCallback } from 'react';
import { AxiosError } from 'axios';
import { apiClient, ApiResponse } from '../services/api';

export interface UseApiOptions {
  onSuccess?: () => void;
  onError?: (error: AxiosError<ApiResponse>) => void;
}

export const useApi = (options?: UseApiOptions) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const request = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | null> => {
      setLoading(true);
      setError(null);
      try {
        const result = await fn();
        options?.onSuccess?.();
        return result;
      } catch (err) {
        const apiError = err as AxiosError<ApiResponse>;
        const message = apiError.response?.data?.error || 'An error occurred';
        setError(message);
        options?.onError?.(apiError);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [options]
  );

  return { loading, error, request };
};

export const useGet = <T,>(path: string) => {
  const [data, setData] = useState<T | null>(null);
  const { loading, error, request } = useApi();

  const fetch = useCallback(async () => {
    const result = await request(() => apiClient.get<T>(path));
    if (result) setData(result);
    return result;
  }, [path, request]);

  return { data, loading, error, fetch };
};

export const usePost = <T,>(path: string) => {
  const { loading, error, request } = useApi();

  const post = useCallback(
    async (body: unknown) => {
      return request(() => apiClient.post<T>(path, body));
    },
    [path, request]
  );

  return { loading, error, post };
};
