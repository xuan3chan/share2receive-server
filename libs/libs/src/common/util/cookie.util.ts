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
    httpOnly: options.httpOnly ?? true, // Use provided option or default to true
    secure: options.secure ?? false, // Use provided option or default to false
    maxAge: options.maxAge ?? 60 * 60 * 1000, // Use provided option or default to 1 hour
    sameSite: options.sameSite ?? 'none', // Use provided option or default to 'none'
    path: options.path ?? '/', // Use provided option or default to '/'
    domain: options.domain, // Use provided option or undefined
  });
}