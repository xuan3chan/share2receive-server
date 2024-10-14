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
    httpOnly: options.httpOnly ?? true, // Allow access by JavaScript if false
    secure: options.secure ?? true, // Use HTTPS in production
    maxAge: options.maxAge ?? 60 * 60 * 1000, // 1-hour expiration by default
    sameSite: options.sameSite ?? 'none', // Allows cross-site cookie sharing
    path: options.path ?? '/', // Cookie valid for the entire domain
    domain: options.domain, // Set the domain if provided (e.g., 'example.com')
  });
}
