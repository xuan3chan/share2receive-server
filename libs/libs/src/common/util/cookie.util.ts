import { Response } from 'express';

const isProduction = process.env.NODE_ENV === 'production';

const defaultCookieOptions: {
  httpOnly: boolean;
  secure: boolean;
  sameSite: boolean | 'none' | 'lax' | 'strict';
  path: string;
} = {
  httpOnly: true,
  secure: isProduction, // Cookies are secure in production
  sameSite: isProduction ? 'none' : 'lax', // Allow cross-origin in production
  path: '/',
};

export function setCookie(
  response: Response,
  name: string,
  value: string,
  options: Partial<typeof defaultCookieOptions> & { domain?: string } = {},
) {
  const finalOptions = {
    ...defaultCookieOptions,
    ...options,
    domain: options.domain ?? 'share2receive-client.vercel.app', // Default domain
  };
  response.cookie(name, value, finalOptions);
  console.log(`Cookie ${name} set with options:`, finalOptions);
}

export function clearCookie(
  response: Response,
  name: string,
  options: Partial<typeof defaultCookieOptions> & { domain?: string } = {},
) {
  const finalOptions = {
    ...defaultCookieOptions,
    ...options,
    domain: options.domain ?? 'share2receive-client.vercel.app', // Default domain
  };
  response.clearCookie(name, finalOptions);
  console.log(`Cookie ${name} cleared with options:`, finalOptions);
}
