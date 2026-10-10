import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

export interface AccessIdentity {
  sub: string;
  email: string;
}

export type Authenticate = (request: Request) => Promise<AccessIdentity | undefined>;

export const createAccessAuthenticator = ({
  teamDomain,
  audience,
  keys,
}: {
  teamDomain: string;
  audience: string;
  keys?: JWTVerifyGetKey;
}): Authenticate => {
  if (!teamDomain || !audience) {
    return async () => undefined;
  }

  const issuer = `https://${teamDomain}`;
  const jwks = keys ?? createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));

  return async (request) => {
    const token = request.headers.get('Cf-Access-Jwt-Assertion');

    if (!token) {
      return undefined;
    }

    try {
      const { payload } = await jwtVerify(token, jwks, { issuer, audience, algorithms: ['RS256'] });
      const { sub, email } = payload as { sub?: unknown; email?: unknown };

      return typeof sub === 'string' && typeof email === 'string' ? { sub, email } : undefined;
    } catch {
      return undefined;
    }
  };
};
