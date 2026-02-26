export interface User {
  id: number;
  email: string;
  full_name: string;
  plan: 'free' | 'pro' | null;
}

export interface SignInRequest {
  email: string;
  password: string;
  remember: boolean;
}

export interface SignInResponse {
  success: boolean;
  user: User;
  token: string;
  redirect: string;
  error?: string;
}

export interface SignUpRequest {
  email: string;
  name: string;
  password: string;
  country: string;
  terms: boolean;
  captcha: string;
  captchaAnswer: string;
}

export interface SignUpResponse {
  success: boolean;
  redirect?: string;
  error?: string;
}

export interface AuthMeResponse {
  user: User;
  error?: string;
}

export interface ForgotPasswordRequest {
  email: string;
}
