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
    sameSite: 'lax',
    path: '/',
  },
) {
  response.cookie(name, value, {
    httpOnly: options.httpOnly ?? false,
    secure: options.secure ?? false, // Set to true in production with HTTPS
    maxAge: options.maxAge ?? 60 * 60 * 1000,
    sameSite: options.sameSite ?? 'lax',
    path: options.path ?? '/',
    domain: options.domain, // Include domain if provided
  });
}

export function clearCookie(
  response: Response,
  name: string,
  options: {
    path?: string;
    domain?: string;
  } = {
    path: '/', // Default to root path
  },
) {
  response.clearCookie(name, {
    path: options.path ?? '/', // Ensure path matches the one used when setting the cookie
    secure: true, // Ensure secure flag is set if the cookie was set with secure=true
    sameSite: 'none', // Ensure sameSite matches the one used when setting the cookie
    domain: options.domain, // Include domain if provided
  });
}