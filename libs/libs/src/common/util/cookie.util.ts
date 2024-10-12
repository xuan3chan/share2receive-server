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
    secure: true, // Set to true for cross-site cookies
    maxAge: 60 * 60 * 1000, // Default 1 hour
    sameSite: 'none', // Required for cross-site cookies
    path: '/',
  },
) {
  response.cookie(name, value, {
    httpOnly: options.httpOnly ?? true, // Use provided option or default to true
    secure: options.secure ?? true, // Use provided option or default to true
    maxAge: options.maxAge ?? 60 * 60 * 1000, // Use provided option or default to 1 hour
    sameSite: options.sameSite ?? 'none', // Use provided option or default to 'none'
    path: options.path ?? '/', // Use provided option or default to '/'
    domain: options.domain, // Use provided option or undefined
  });
}