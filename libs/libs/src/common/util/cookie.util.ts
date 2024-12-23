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
    secure: process.env.NODE_ENV === 'production', // HTTPS trong production
    maxAge: 60 * 60 * 1000, // Default 1 hour
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' yêu cầu HTTPS
    path: '/',
  },
) {
  response.cookie(name, value, {
    httpOnly: options.httpOnly ?? true,
    secure: options.secure ?? (process.env.NODE_ENV === 'production'),
    maxAge: options.maxAge ?? 60 * 60 * 1000,
    sameSite: options.sameSite ?? (process.env.NODE_ENV === 'production' ? 'none' : 'lax'),
    path: options.path ?? '/',
    domain: options.domain,
  });
}



export function clearCookie(
  response: Response,
  name: string,
  options: {
    path?: string;
    domain?: string;
  } = {
    path: '/', // Mặc định xóa cookie từ root
  },
) {
  response.clearCookie(name, {
    path: options.path ?? '/', // Đảm bảo path giống với khi cookie được tạo
    secure: true, // Nếu cookie được tạo với secure=true, cần đảm bảo secure trong xóa cookie
    sameSite: 'none', // Giống khi tạo cookie
  });
}
