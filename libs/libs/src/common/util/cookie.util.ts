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
    httpOnly: false,
    secure: false, // Set to true in production with HTTPS
    maxAge: 60 * 60 * 1000, // Default 1 hour
    sameSite: 'none',
    path: '/',
    domain: undefined, // Optional: set a specific domain if required
  },
) {
  response.cookie(name, value, {
    httpOnly: options.httpOnly ?? false,
    secure: true,
    maxAge: options.maxAge ?? 60 * 60 * 1000,
    sameSite: options.sameSite ?? 'none',
    path: options.path ?? '/',
    domain: options.domain ?? undefined,
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
    domain: undefined, // Mặc định không yêu cầu domain cụ thể
  },
) {
  response.clearCookie(name, {
    path: options.path ?? '/', // Đảm bảo path giống với khi cookie được tạo
    domain: options.domain ?? undefined, // Đảm bảo domain giống với khi cookie được tạo
    secure: true, // Nếu cookie được tạo với secure=true, cần đảm bảo secure trong xóa cookie
    sameSite: 'none', // Giống khi tạo cookie
  });
}
