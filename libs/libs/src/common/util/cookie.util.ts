import { Response } from 'express';

export function setCookie(
  response: Response,
  name: string,
  value: string,
  options: {
    httpOnly?: boolean;
    secure?: boolean;
    maxAge?: number;
    sameSite?: 'strict' | 'lax' | 'none';
    path?: string;
    domain?: string;
  } = {},
) {
  const defaults = {
    httpOnly: true, // Bảo mật mặc định
    secure: process.env.NODE_ENV === 'production', // Dựa trên môi trường
    maxAge: 60 * 60 * 1000, // 1 giờ
    sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'strict' | 'lax' | 'none', // 'none' cho production
    path: '/',
  };

  response.cookie(name, value, { ...defaults, ...options });
}

export function clearCookie(
  response: Response,
  name: string,
  options: {
    path?: string;
    domain?: string;
  } = {},
) {
  const defaults = {
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'strict' | 'lax' | 'none',
  };

  response.clearCookie(name, { ...defaults, ...options });
}
