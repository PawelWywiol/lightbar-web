import { createHash } from 'node:crypto';

const INLINE_SCRIPT = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g;

const hashInlineScripts = (html: string) =>
  [...html.matchAll(INLINE_SCRIPT)]
    .filter(([tag, content]) => !tag.slice(0, tag.indexOf('>')).includes(' src=') && content)
    .map(([, content = '']) => `'sha256-${createHash('sha256').update(content).digest('base64')}'`);

export const createSecurityHeaders = (html: string) => {
  const contentSecurityPolicy = [
    "default-src 'self'",
    `script-src 'self' ${hashInlineScripts(html).join(' ')}`.trim(),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "connect-src 'self' http: https:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');

  return [
    '/*',
    `  Content-Security-Policy: ${contentSecurityPolicy}`,
    '  Strict-Transport-Security: max-age=31536000; includeSubDomains',
    '  X-Content-Type-Options: nosniff',
    '  Referrer-Policy: strict-origin-when-cross-origin',
    '',
  ].join('\n');
};
