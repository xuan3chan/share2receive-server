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
    secure: isProduction, // Secure in production
    maxAge: 60 * 60 * 1000, // Default 1 hour
    sameSite: isProduction ? 'none' : 'lax', // Allow cross-origin in production
    path: '/',
  },
) {
  response.cookie(name, value, {
    httpOnly: options.httpOnly ?? true, // Ensure httpOnly for security
    secure: options.secure ?? isProduction, // Use secure cookies in production
    maxAge: options.maxAge ?? 60 * 60 * 1000,
    sameSite: options.sameSite ?? (isProduction ? 'none' : 'lax'), // Allow cross-origin cookies
    path: options.path ?? '/',
    domain: options.domain ?? 'share2receive-client.vercel.app', // Adjust domain if needed
  });
  console.log(`Cookie ${name} set with options:`, {
    httpOnly: options.httpOnly,
    secure: options.secure,
    maxAge: options.maxAge,
    sameSite: options.sameSite,
    path: options.path,
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
    path: '/',
  },
) {
  response.clearCookie(name, {
    path: options.path ?? '/',
    secure: isProduction, // Match secure setting with setCookie
    sameSite: isProduction ? 'none' : 'lax', // Match sameSite setting
    domain: options.domain ?? 'share2receive-client.vercel.app', // Adjust domain if needed
  });
  console.log(`Cookie ${name} cleared with options:`, {
    path: options.path,
    domain: options.domain,
  });
}
