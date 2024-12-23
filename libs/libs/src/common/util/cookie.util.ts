import { Response } from 'express';

const isProduction = process.env.NODE_ENV === 'production';

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
    secure: isProduction,
    maxAge: 60 * 60 * 1000, // Default 1 hour
    sameSite: isProduction ? 'none' : 'lax', // Allow cross-origin in production
    path: '/',
  },
) {
  response.cookie(name, value, {
    httpOnly: options.httpOnly ?? true,
    secure: options.secure ?? isProduction, // Secure only in production
    maxAge: options.maxAge ?? 60 * 60 * 1000,
    sameSite: options.sameSite ?? (isProduction ? 'none' : 'lax'),
    path: options.path ?? '/',
    domain: options.domain ?? 'share2receive-client.vercel.app', // Adjust domain
  });
}

export function clearCookie(
  response: Response,
  name: string,
  options: {
    path?: string;
    domain?: string;
  } = {
    path: '/',
  },
) {
  response.clearCookie(name, {
    path: options.path ?? '/',
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    domain: options.domain ?? 'share2receive-client.vercel.app', // Adjust domain
  });
}
