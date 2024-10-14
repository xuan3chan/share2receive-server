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
    domain: undefined, // Optional: set a specific domain if required
  },
) {
  response.cookie(name, value, {
    httpOnly: false, // Cookie không thể truy cập từ JS
    secure: true, // Cookie chỉ được gửi qua HTTPS
    maxAge: options.maxAge ?? 60 * 60 * 1000, // Cookie tồn tại trong 1 giờ
    sameSite: 'none', // Cho phép chia sẻ cookie giữa các domain khác nhau
    domain: options.domain, // Optional: set a specific domain if required
  });
}
