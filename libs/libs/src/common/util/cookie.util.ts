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
    httpOnly: true, // Bảo mật hơn bằng cách mặc định chỉ cho phép HTTP
    secure: process.env.NODE_ENV === 'production', // Sử dụng HTTPS trong production
    maxAge: 60 * 60 * 1000, // 1 giờ
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Cross-origin cần 'none'
    path: '/', // Áp dụng toàn bộ domain
    domain: process.env.NODE_ENV === 'production' ? '.share2receive.io.vn' : undefined, // Subdomain trong production
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
    domain: process.env.NODE_ENV === 'production' ? '.share2receive.io.vn' : undefined, // Subdomain trong production
  },
) {
  response.clearCookie(name, {
    path: options.path ?? '/', // Đảm bảo path giống với khi cookie được tạo
    secure: process.env.NODE_ENV === 'production', // Chỉ xóa nếu HTTPS được bật
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Giống khi tạo cookie
    domain: options.domain,
  });
}
