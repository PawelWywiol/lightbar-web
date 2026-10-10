// @vitest-environment node
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createSecurityHeaders } from './securityHeaders';

const sha = (content: string) => `'sha256-${createHash('sha256').update(content).digest('base64')}'`;

describe('createSecurityHeaders', () => {
  it('allows only hashed inline scripts and keeps device connections', () => {
    const html =
      '<head><script>window.a = 1;</script><script type="module" src="/assets/x.js"></script></head>' +
      '<body><script>window.b = 2;</script><script type="module" async="">import "/assets/y.js";</script></body>';

    const headers = createSecurityHeaders(html);

    expect(headers).toContain(
      `script-src 'self' ${sha('window.a = 1;')} ${sha('window.b = 2;')} ${sha('import "/assets/y.js";')}`,
    );
    expect(/script-src[^;]*unsafe-inline/.test(headers)).toBe(false);
    expect(headers).toContain("connect-src 'self' http: https:");
    expect(headers).toContain("frame-ancestors 'none'");
    expect(headers).toContain('Strict-Transport-Security: max-age=31536000; includeSubDomains');
    expect(headers.startsWith('/*\n')).toBe(true);
  });
});
