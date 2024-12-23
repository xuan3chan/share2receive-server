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
    httpOnly: false,
    secure: isProduction,
    maxAge: 60 * 60 * 1000,
    sameSite: 'none',
    path: '/',
  },
) {
  try {
    response.cookie(name, value, {
      httpOnly: options.httpOnly ?? false,
      secure: options.secure ?? isProduction,
      maxAge: options.maxAge ?? 60 * 60 * 1000,
      sameSite: options.sameSite ?? (isProduction ? 'none' : 'lax'),
      path: options.path ?? '/',
      domain: options.domain,
    });
    console.log(`Cookie ${name} set successfully`);
  } catch (error) {
    console.error(`Failed to set cookie ${name}:`, error);
  }
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
  try {
    response.clearCookie(name, {
      path: options.path ?? '/',
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      domain: options.domain,
    });
    console.log(`Cookie ${name} cleared successfully`);
  } catch (error) {
    console.error(`Failed to clear cookie ${name}:`, error);
  }
}
