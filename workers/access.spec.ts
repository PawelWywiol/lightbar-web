// @vitest-environment node
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';
import { createAccessAuthenticator } from './access';

const TEAM_DOMAIN = 'team.cloudflareaccess.com';
const AUDIENCE = 'aud-tag';

let privateKey: CryptoKey;
let otherKey: CryptoKey;
let keys: ReturnType<typeof createLocalJWKSet>;

const sign = (claims: Record<string, unknown>, key = privateKey, issuer = `https://${TEAM_DOMAIN}`) =>
  new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid: 'key-1' })
    .setIssuer(issuer)
    .setAudience(AUDIENCE)
    .setExpirationTime('5m')
    .sign(key);

const requestWith = (token?: string) =>
  new Request('https://lightbar.wywiol.eu/api/admin/me', {
    headers: token ? { 'Cf-Access-Jwt-Assertion': token } : {},
  });

describe('createAccessAuthenticator', () => {
  beforeAll(async () => {
    const pair = await generateKeyPair('RS256');
    privateKey = pair.privateKey;
    otherKey = (await generateKeyPair('RS256')).privateKey;
    keys = createLocalJWKSet({ keys: [{ ...(await exportJWK(pair.publicKey)), kid: 'key-1', alg: 'RS256' }] });
  });

  it('returns identity for valid token', async () => {
    const authenticate = createAccessAuthenticator({ teamDomain: TEAM_DOMAIN, audience: AUDIENCE, keys });

    await expect(authenticate(requestWith(await sign({ sub: 'user-1', email: 'a@b.c' })))).resolves.toEqual({
      sub: 'user-1',
      email: 'a@b.c',
    });
  });

  it('rejects missing, foreign-signed, wrong issuer and incomplete tokens', async () => {
    const authenticate = createAccessAuthenticator({ teamDomain: TEAM_DOMAIN, audience: AUDIENCE, keys });

    await expect(authenticate(requestWith())).resolves.toBeUndefined();
    await expect(authenticate(requestWith('not-a-jwt'))).resolves.toBeUndefined();
    await expect(authenticate(requestWith(await sign({ sub: 'u', email: 'e' }, otherKey)))).resolves.toBeUndefined();
    await expect(
      authenticate(requestWith(await sign({ sub: 'u', email: 'e' }, privateKey, 'https://evil.cloudflareaccess.com'))),
    ).resolves.toBeUndefined();
    await expect(authenticate(requestWith(await sign({ sub: 'u' })))).resolves.toBeUndefined();
  });

  it('fails closed when not configured', async () => {
    const authenticate = createAccessAuthenticator({ teamDomain: '', audience: '', keys });

    await expect(authenticate(requestWith(await sign({ sub: 'u', email: 'e' })))).resolves.toBeUndefined();
  });
});
