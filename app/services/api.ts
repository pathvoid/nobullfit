import { API_BASE_URL } from '@/constants/Api';
import { getToken } from '@/services/tokenStorage';
import type {
  SignInRequest,
  SignInResponse,
  SignUpRequest,
  SignUpResponse,
  AuthMeResponse,
  ForgotPasswordRequest,
} from '@/types/auth';

// Helper to make API requests with optional auth
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'An unexpected error occurred.');
  }

  return data as T;
}

export async function signIn(payload: SignInRequest): Promise<SignInResponse> {
  return fetchApi<SignInResponse>('/sign-in', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function signUp(payload: SignUpRequest): Promise<SignUpResponse> {
  return fetchApi<SignUpResponse>('/sign-up', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getMe(): Promise<AuthMeResponse> {
  return fetchApi<AuthMeResponse>('/auth/me');
}

export async function forgotPassword(payload: ForgotPasswordRequest): Promise<{ success: boolean }> {
  return fetchApi<{ success: boolean }>('/forgot-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function logout(): Promise<void> {
  try {
    await fetchApi<{ success: boolean }>('/auth/logout', { method: 'POST' });
  } catch {
    // Ignore errors -- we clear token locally regardless
  }
}
