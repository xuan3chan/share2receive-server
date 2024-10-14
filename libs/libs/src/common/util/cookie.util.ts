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
  } = {
    httpOnly: true,
    secure: false, // Set to true in production with HTTPS
    maxAge: 60 * 60 * 1000, // Default 1 hour
    sameSite: 'none',
    path: '/',
    domain: '.vercel.app', // Allow cookie sharing across subdomains on vercel.app
  },
) {
  response.cookie(name, value, {
    httpOnly: options.httpOnly ?? true, // Cookie không thể truy cập từ JS
    secure: options.secure ?? true, // Cookie chỉ được gửi qua HTTPS
    maxAge: options.maxAge ?? 60 * 60 * 1000, // Cookie tồn tại trong 1 giờ
    sameSite: options.sameSite ?? 'none', // Cookie không được gửi khi request từ domain khác
    path: options.path ?? '/', // Đường dẫn cookie
    domain: options.domain ?? '.vercel.app', // Allow sharing cookie across subdomains of Vercel
  });
}
