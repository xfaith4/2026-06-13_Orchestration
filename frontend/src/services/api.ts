import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:3000/api';

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  errors?: Array<{ path: string; message: string }>;
  timestamp: string;
}

class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string = API_BASE_URL) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<ApiResponse>) => {
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  async get<T>(path: string): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(path);
    return response.data.data as T;
  }

  async post<T>(path: string, data: unknown): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(path, data);
    return response.data.data as T;
  }

  async put<T>(path: string, data: unknown): Promise<T> {
    const response = await this.client.put<ApiResponse<T>>(path, data);
    return response.data.data as T;
  }

  async delete<T>(path: string): Promise<T> {
    const response = await this.client.delete<ApiResponse<T>>(path);
    return response.data.data as T;
  }
}

export const apiClient = new ApiClient();
